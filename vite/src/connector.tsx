import { createContext, useState, useCallback, useEffect } from 'react'
import { createPublicClient, createWalletClient, fallback, http, custom, getAddress } from 'viem'
import { sdk } from '@farcaster/miniapp-sdk'
import { robinhood, ethereum } from './chains'
import { ETH_YIELD_VAULT_ABI, ETH_YIELD_VAULT_ADDRESS } from './config/ethYieldVaultABI'

const UNISWAP_API_URL = 'https://trade-api.gateway.uniswap.org/v1'
const UNISWAP_API_KEY = (import.meta as any).env?.VITE_UNISWAP_API_KEY as string | undefined
const KYBERSWAP_API_BASE = 'https://aggregator-api.kyberswap.com/ethereum/api/v1'
const KYBERSWAP_CLIENT_ID = 'little-john-bot'
const INFURA_API_KEY = (import.meta as any).env?.VITE_INFURA_API_KEY as string | undefined
const ETHEREUM_RPC_URLS = [
  INFURA_API_KEY ? `https://mainnet.infura.io/v3/${INFURA_API_KEY}` : undefined,
  (import.meta as any).env?.VITE_ETHEREUM_RPC_URL,
  'https://ethereum.publicnode.com',
  'https://eth.merkle.io',
].filter(Boolean) as string[]

export const ROBINHOOD_PUBLIC_CLIENT = createPublicClient({ chain: robinhood, transport: http() })
export const PUBLIC_CLIENT = ROBINHOOD_PUBLIC_CLIENT
export const ETHEREUM_PUBLIC_CLIENT = createPublicClient({
  chain: ethereum,
  transport: fallback(
    ETHEREUM_RPC_URLS.map(url => http(url, { timeout: 10_000, retryCount: 1, retryDelay: 500 })),
    { rank: false, retryCount: 1, retryDelay: 500 },
  ),
})

export function getWalletClient(account?: string, chain?: any) {
  if (typeof window === 'undefined' || !(window as any).ethereum) throw new Error('No Ethereum provider found')
  return createWalletClient({
    chain: chain || robinhood,
    transport: custom((window as any).ethereum),
    ...(account ? { account: getAddress(account) } : {}),
  })
}

interface WalletContextType {
  address?: string
  chainId?: number
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
}

export const WalletContext = createContext<WalletContextType>({
  address: undefined,
  chainId: undefined,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string>()
  const [chainId, setChainId] = useState<number>()
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(async () => {
    const client = getWalletClient()
    const accounts = await client.requestAddresses()
    if (accounts.length) {
      setAddress(getAddress(accounts[0]))
      setIsConnected(true)
      setChainId(Number(await client.getChainId()))
    }
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        if ((window as any).ethereum) {
          const client = getWalletClient()
          const accounts = await client.getAddresses()
          if (accounts.length) {
            setAddress(getAddress(accounts[0]))
            setIsConnected(true)
            setChainId(Number(await client.getChainId()))
          }
        }
      } catch {
        // Wallet may not be available yet.
      }
    }
    void check()
  }, [])

  useEffect(() => {
    const provider = typeof window !== 'undefined' ? (window as any).ethereum : undefined
    if (!provider?.on) return

    const accountsChanged = (accounts: string[]) => {
      const next = accounts?.[0]
      setAddress(next ? getAddress(next) : undefined)
      setIsConnected(Boolean(next))
      if (!next) setChainId(undefined)
    }
    const chainChanged = (id: string) => setChainId(Number.parseInt(id, 16))

    provider.on('accountsChanged', accountsChanged)
    provider.on('chainChanged', chainChanged)
    return () => {
      provider.removeListener?.('accountsChanged', accountsChanged)
      provider.removeListener?.('chainChanged', chainChanged)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(undefined)
    setIsConnected(false)
    setChainId(undefined)
  }, [])

  const switchChain = useCallback(async (target: number) => {
    if (!(window as any).ethereum) throw new Error('No Ethereum provider found')
    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${target.toString(16)}` }],
    })
    setChainId(target)
  }, [])

  return <WalletContext.Provider value={{ address, chainId, isConnected, connect, disconnect, switchChain }}>{children}</WalletContext.Provider>
}

function getPublicClient(chain: any) {
  return chain.id === ethereum.id ? ETHEREUM_PUBLIC_CLIENT : ROBINHOOD_PUBLIC_CLIENT
}

export async function getBalance(address: `0x${string}`, chain: any = robinhood) {
  return getPublicClient(chain).getBalance({ address: getAddress(address) })
}

export async function getNativeBalance(address: `0x${string}`, chain: any = robinhood) {
  return getPublicClient(chain).getBalance({ address: getAddress(address) })
}

export async function sendRawTransaction(params: {
  account: `0x${string}`
  to: `0x${string}`
  data: `0x${string}`
  value?: bigint
  gas?: bigint
  chain?: any
}) {
  const { account, to, data, value = 0n, gas, chain = robinhood } = params
  const client = getWalletClient(account, chain)
  const publicClient = getPublicClient(chain)
  const walletChainId = Number.parseInt(await (window as any).ethereum.request({ method: 'eth_chainId' }), 16)
  if (walletChainId !== chain.id) throw new Error(`Wallet is on chain ${walletChainId}; expected ${chain.id}.`)

  const gasLimit = gas ?? await publicClient.estimateGas({ account: getAddress(account), to: getAddress(to), data, value })
  return client.sendTransaction({ account: getAddress(account), to: getAddress(to), data, value, gas: gasLimit, chain })
}

export async function sendContractTransaction(params: {
  account: string
  address: string
  abi: any
  functionName: string
  args?: any[]
  value?: bigint
  gas?: bigint
  chain?: any
}) {
  const { account, address, abi, functionName, args = [], value, gas, chain = robinhood } = params
  return getWalletClient(account, chain).writeContract({
    account: getAddress(account), address: getAddress(address), abi, functionName, args, value, chain,
    ...(gas !== undefined ? { gas } : {}),
  })
}

const BALANCE_ABI = [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }] as const
const ALLOWANCE_ABI = [{ name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: 'value', type: 'uint256' }] }] as const

export async function getTokenBalance(params: { tokenAddress: string; account: string; chain?: any }): Promise<bigint> {
  const { tokenAddress, account, chain = robinhood } = params
  return getPublicClient(chain).readContract({ address: getAddress(tokenAddress), abi: BALANCE_ABI, functionName: 'balanceOf', args: [getAddress(account)] }) as Promise<bigint>
}

export async function getAllowance(params: { tokenAddress: string; owner: string; spender: string; chain?: any }): Promise<bigint> {
  const { tokenAddress, owner, spender, chain = robinhood } = params
  return getPublicClient(chain).readContract({ address: getAddress(tokenAddress), abi: ALLOWANCE_ABI, functionName: 'allowance', args: [getAddress(owner), getAddress(spender)] }) as Promise<bigint>
}

export async function waitForTransactionReceipt(hash: `0x${string}`) { return ROBINHOOD_PUBLIC_CLIENT.waitForTransactionReceipt({ hash }) }
export async function waitForEthereumTransactionReceipt(hash: `0x${string}`) { return ETHEREUM_PUBLIC_CLIENT.waitForTransactionReceipt({ hash }) }

export async function vaultDeposit(params: { account: string; assets: bigint; receiver: string }) {
  const hash = await sendContractTransaction({ account: params.account, address: ETH_YIELD_VAULT_ADDRESS, abi: ETH_YIELD_VAULT_ABI, functionName: 'deposit', args: [params.assets, getAddress(params.receiver)], chain: ethereum })
  return waitForEthereumTransactionReceipt(hash as `0x${string}`)
}

export async function estimateVaultDepositGas(params: { account: string; assets: bigint; receiver: string }): Promise<bigint> {
  return ETHEREUM_PUBLIC_CLIENT.estimateContractGas({ account: getAddress(params.account), address: getAddress(ETH_YIELD_VAULT_ADDRESS), abi: ETH_YIELD_VAULT_ABI, functionName: 'deposit', args: [params.assets, getAddress(params.receiver)] })
}

export async function getCurrentGasPrice(): Promise<bigint> { return ETHEREUM_PUBLIC_CLIENT.getGasPrice() }

async function readJson(response: Response, operation: string) {
  const raw = await response.text()
  let json: any
  try { json = JSON.parse(raw) } catch { throw new Error(`${operation} returned invalid JSON: ${raw.slice(0, 500)}`) }
  if (!response.ok) throw new Error(`${operation} failed: HTTP ${response.status}: ${raw.slice(0, 500)}`)
  return json
}

async function uniswapRequest(path: string, init: RequestInit) {
  if (!UNISWAP_API_KEY) throw new Error('VITE_UNISWAP_API_KEY is not configured')
  const response = await fetch(`${UNISWAP_API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-api-key': UNISWAP_API_KEY, ...(init.headers || {}) } })
  const json = await readJson(response, `Uniswap ${path}`)
  if (json.errorCode) throw new Error(`Uniswap ${path} failed: ${json.errorCode} — ${json.detail || json.message || JSON.stringify(json)}`)
  return json
}

export async function quoteUniswapBridge(params: { tokenIn: string; tokenOut: string; tokenInChainId: number; tokenOutChainId: number; amount: bigint; swapper: `0x${string}`; recipient?: `0x${string}` }) {
  const body: Record<string, unknown> = { tokenIn: params.tokenIn, tokenOut: params.tokenOut, tokenInChainId: params.tokenInChainId, tokenOutChainId: params.tokenOutChainId, amount: params.amount.toString(), type: 'EXACT_INPUT', swapper: params.swapper }
  if (params.recipient) body.recipient = params.recipient
  return uniswapRequest('/quote', { method: 'POST', body: JSON.stringify(body) })
}

export async function createUniswapBridgeTransaction(quoteResponse: any) {
  if (quoteResponse.routing !== 'BRIDGE') throw new Error(`Expected BRIDGE quote, received ${quoteResponse.routing}`)
  const response = await uniswapRequest('/swap', { method: 'POST', headers: { 'x-universal-router-version': '2.1.2' }, body: JSON.stringify({ quote: quoteResponse.quote }) })
  const tx = response.swap ?? response.transaction ?? response
  if (!tx || typeof tx.to !== 'string' || typeof tx.data !== 'string') throw new Error('Uniswap /swap did not return a valid bridge transaction')
  if (Number(tx.chainId) !== robinhood.id) throw new Error(`Uniswap bridge transaction targets chain ${tx.chainId}, expected ${robinhood.id}`)
  return { ...tx, to: getAddress(tx.to) }
}

export async function quoteKyberSwap(params: { chainId: number; tokenIn: string; tokenOut: string; amountIn: string; sender: `0x${string}` }) {
  if (params.chainId !== ethereum.id) throw new Error(`KyberSwap destination chain must be Ethereum (${ethereum.id})`)
  const url = new URL(`${KYBERSWAP_API_BASE}/routes`)
  url.search = new URLSearchParams({ tokenIn: params.tokenIn, tokenOut: params.tokenOut, amountIn: params.amountIn, gasInclude: 'true', saveGas: 'true' }).toString()
  const response = await fetch(url, { headers: { 'x-client-id': KYBERSWAP_CLIENT_ID } })
  const json = await readJson(response, 'KyberSwap route')
  if (json.code !== 0) throw new Error(json.message || `KyberSwap route failed: ${JSON.stringify(json)}`)
  if (!json.data?.routeSummary) throw new Error('KyberSwap route did not return routeSummary')
  return json.data
}

export async function buildKyberSwapTransaction(params: { chainId: number; routeSummary: unknown; sender: `0x${string}`; recipient: `0x${string}` }) {
  if (params.chainId !== ethereum.id) throw new Error(`KyberSwap destination chain must be Ethereum (${ethereum.id})`)
  const response = await fetch(`${KYBERSWAP_API_BASE}/route/build`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-client-id': KYBERSWAP_CLIENT_ID }, body: JSON.stringify({ routeSummary: params.routeSummary, sender: params.sender, recipient: params.recipient, slippageTolerance: 50, deadline: Math.floor(Date.now() / 1000) + 600, source: KYBERSWAP_CLIENT_ID, enableGasEstimation: true }) })
  const json = await readJson(response, 'KyberSwap route build')
  if (json.code !== 0) throw new Error(json.message || `KyberSwap build failed: ${JSON.stringify(json)}`)
  const data = json.data
  if (!data || typeof data.data !== 'string' || !/^0x[a-fA-F0-9]+$/.test(data.data) || typeof data.routerAddress !== 'string') throw new Error(`KyberSwap build returned an invalid encoded response: ${JSON.stringify(json)}`)
  return { to: getAddress(data.routerAddress), data: data.data as `0x${string}`, value: BigInt(data.transactionValue || '0'), gas: data.gas ? BigInt(data.gas) : undefined }
}

export async function getContractBalance(params: { address: string; abi: any; functionName: string; args?: any[]; chain?: any }) { const { address, abi, functionName, args = [], chain = robinhood } = params; return getPublicClient(chain).readContract({ address: getAddress(address), abi, functionName, args }) }
export async function simulateContract(params: { account: string; address: string; abi: any; functionName: string; args?: any[]; chain?: any }) { const { account, address, abi, functionName, args = [], chain = robinhood } = params; const { result } = await getPublicClient(chain).simulateContract({ account: getAddress(account), address: getAddress(address), abi, functionName, args }); return result }
export async function getVaultBalance(account: string) { return ETHEREUM_PUBLIC_CLIENT.readContract({ address: getAddress(ETH_YIELD_VAULT_ADDRESS), abi: ETH_YIELD_VAULT_ABI, functionName: 'balanceOf', args: [getAddress(account)] }) }
export async function getVaultTotalAssets() { return ETHEREUM_PUBLIC_CLIENT.readContract({ address: getAddress(ETH_YIELD_VAULT_ADDRESS), abi: ETH_YIELD_VAULT_ABI, functionName: 'totalAssets' }) }
export async function getVaultStrategy() { return ETHEREUM_PUBLIC_CLIENT.readContract({ address: getAddress(ETH_YIELD_VAULT_ADDRESS), abi: ETH_YIELD_VAULT_ABI, functionName: 'strategy' }) }
export async function getVaultShares(account: string) { return ETHEREUM_PUBLIC_CLIENT.readContract({ address: getAddress(ETH_YIELD_VAULT_ADDRESS), abi: ETH_YIELD_VAULT_ABI, functionName: 'balanceOf', args: [getAddress(account)] }) }
export async function initSDK() { try { await sdk.actions.ready() } catch (error) { console.error('SDK init failed:', error) } }