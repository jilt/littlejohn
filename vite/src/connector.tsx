import { createContext, useState, useCallback, useEffect } from 'react'
import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  custom,
} from 'viem'
import { sdk } from '@farcaster/miniapp-sdk'
import { robinhood, ethereum } from './chains'
import {
  ETH_YIELD_VAULT_ABI,
  ETH_YIELD_VAULT_ADDRESS,
} from './config/ethYieldVaultABI'
import { CONTRACTS } from './config/contracts'

const KYBERSWAP_API =
  'https://aggregator-api.kyberswap.com/robinhood/api/v1'
const KYBERSWAP_CROSS_CHAIN_API =
  'https://aggregator-api.kyberswap.com/api/v1/cross-chain'
const X_CLIENT_ID = 'ai-agent-skills'
const KYBERSWAP_EARN_API = 'https://earn-service.kyberswap.com/api/v1'

const INFURA_API_KEY = (import.meta as any).env?.VITE_INFURA_API_KEY as
  | string
  | undefined

const ETHEREUM_RPC_URLS = [
  INFURA_API_KEY
    ? `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
    : undefined,
  (import.meta as any).env?.VITE_ETHEREUM_RPC_URL,
  'https://ethereum.publicnode.com',
  'https://eth.merkle.io',
].filter(Boolean) as string[]

export const ROBINHOOD_PUBLIC_CLIENT = createPublicClient({
  chain: robinhood,
  transport: http(),
})

export const PUBLIC_CLIENT = ROBINHOOD_PUBLIC_CLIENT

export const ETHEREUM_PUBLIC_CLIENT = createPublicClient({
  chain: ethereum,
  transport: fallback(
    ETHEREUM_RPC_URLS.map(url =>
      http(url, {
        timeout: 10_000,
        retryCount: 1,
        retryDelay: 500,
      }),
    ),
    {
      rank: false,
      retryCount: 1,
      retryDelay: 500,
    },
  ),
})

export function getWalletClient(account?: string, chain?: any) {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No Ethereum provider found')
  }

  return createWalletClient({
    chain: chain || robinhood,
    transport: custom((window as any).ethereum),
    ...(account ? { account: account as `0x${string}` } : {}),
  })
}

interface WalletContextType {
  address: string | undefined
  chainId: number | undefined
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
  const [chainId, setChainId] = useState<number | undefined>(undefined)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(async () => {
    try {
      const client = getWalletClient()
      const accounts = await client.requestAddresses()

      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        const id = await client.getChainId()
        setChainId(Number(id))
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err)
    }
  }, [])

  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const client = getWalletClient()
          const accounts = await client.getAddresses()

          if (accounts.length > 0) {
            setAddress(accounts[0])
            setIsConnected(true)
            const id = await client.getChainId()
            setChainId(Number(id))
          }
        }
      } catch {
        // Wallet may not be available yet.
      }
    }

    checkExistingConnection()
  }, [])

  useEffect(() => {
    const provider =
      typeof window !== 'undefined' ? (window as any).ethereum : undefined

    if (!provider?.on) return

    const handleAccountsChanged = (accounts: string[]) => {
      const nextAddress = accounts?.[0]
      setAddress(nextAddress)
      setIsConnected(Boolean(nextAddress))
      if (!nextAddress) setChainId(undefined)
    }

    const handleChainChanged = (hexChainId: string) => {
      setChainId(Number.parseInt(hexChainId, 16))
    }

    provider.on('accountsChanged', handleAccountsChanged)
    provider.on('chainChanged', handleChainChanged)

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged)
      provider.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(undefined)
    setIsConnected(false)
    setChainId(undefined)
  }, [])

  const switchChain = useCallback(async (chainIdParam: number) => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('No Ethereum provider found')
    }

    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainIdParam.toString(16)}` }],
    })

    setChainId(chainIdParam)
  }, [])

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        connect,
        disconnect,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

function getPublicClient(chain: any) {
  return chain.id === ethereum.id
    ? ETHEREUM_PUBLIC_CLIENT
    : ROBINHOOD_PUBLIC_CLIENT
}

export async function getContractBalance(params: {
  address: string
  abi: any
  functionName: string
  args?: any[]
  chain?: any
}) {
  const {
    address,
    abi,
    functionName,
    args = [],
    chain = robinhood,
  } = params

  return await getPublicClient(chain).readContract({
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
  })
}

export async function getBalance(address: `0x${string}`): Promise<bigint> {
  return await ROBINHOOD_PUBLIC_CLIENT.getBalance({ address })
}

export async function simulateContract(params: {
  account: string
  address: string
  abi: any
  functionName: string
  args?: any[]
  chain?: any
}) {
  const {
    account,
    address,
    abi,
    functionName,
    args = [],
    chain = robinhood,
  } = params

  const client = getPublicClient(chain)

  const { result } = await client.simulateContract({
    account: account as `0x${string}`,
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
  })

  return result
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
  const {
    account,
    address,
    abi,
    functionName,
    args = [],
    value,
    gas,
    chain = robinhood,
  } = params

  const client = getWalletClient(account, chain)

  return await client.writeContract({
    account: account as `0x${string}`,
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
    value,
    chain,
    ...(gas !== undefined ? { gas } : {}),
  })
}

export async function sendRawTransaction(params: {
  account: `0x${string}`
  to: `0x${string}`
  data: `0x${string}`
  value?: bigint
  gas?: bigint
  chain?: any
}) {
  const {
    account,
    to,
    data,
    value = 0n,
    gas,
    chain = robinhood,
  } = params

  const client = getWalletClient(account, chain)
  const publicClient = getPublicClient(chain)

  const walletChainHex = await (window as any).ethereum.request({
    method: 'eth_chainId',
  })

  const walletChainId = Number.parseInt(walletChainHex, 16)

  if (walletChainId !== chain.id) {
    throw new Error(
      `Wallet is on chain ${walletChainId}; expected ${chain.id}.`,
    )
  }

  const gasLimit =
    gas ??
    (await publicClient.estimateGas({
      account,
      to,
      data,
      value,
    }))

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await client.sendTransaction({
        account,
        to,
        data,
        value,
        gas: (gasLimit * 120n) / 100n,
        chain,
      })
    } catch (err: any) {
      if (
        err.message?.includes('Extension context invalidated') &&
        attempt < 2
      ) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }

      throw err
    }
  }

  throw new Error('Transaction failed after retries')
}

export async function getVaultBalance(account: string) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'balanceOf',
    args: [account as `0x${string}`],
  })
}

export async function getVaultTotalAssets() {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'totalAssets',
  })
}

export async function getVaultStrategy() {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'strategy',
  })
}

export async function getVaultShares(address: string) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  })
}

const ERC20_BALANCE_OF_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const

const ERC20_ALLOWANCE_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: 'value', type: 'uint256' }],
  },
] as const

export async function getTokenBalance(params: {
  tokenAddress: string
  account: string
  chain?: any
}): Promise<bigint> {
  const {
    tokenAddress,
    account,
    chain = robinhood,
  } = params

  try {
    return (await getPublicClient(chain).readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [account as `0x${string}`],
    })) as bigint
  } catch (error) {
    console.error('[connector] token balance read failed', {
      chainId: chain.id,
      tokenAddress,
      account,
      error,
    })
    throw error
  }
}

export async function getAllowance(params: {
  tokenAddress: string
  owner: string
  spender: string
  chain?: any
}): Promise<bigint> {
  const {
    tokenAddress,
    owner,
    spender,
    chain = robinhood,
  } = params

  return (await getPublicClient(chain).readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: 'allowance',
    args: [owner as `0x${string}`, spender as `0x${string}`],
  })) as bigint
}

export async function vaultDeposit(params: {
  account: string
  assets: bigint
  receiver: string
}) {
  const {
    account,
    assets,
    receiver,
  } = params

  const txHash = await sendContractTransaction({
    account,
    address: ETH_YIELD_VAULT_ADDRESS,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'deposit',
    args: [assets, receiver as `0x${string}`],
    chain: ethereum,
  })

  return await waitForEthereumTransactionReceipt(txHash as `0x${string}`)
}

export async function vaultWithdraw(params: {
  account: string
  assets: bigint
  receiver: string
  owner: string
}) {
  const {
    account,
    assets,
    receiver,
    owner,
  } = params

  return await sendContractTransaction({
    account,
    address: ETH_YIELD_VAULT_ADDRESS,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'withdraw',
    args: [
      assets,
      receiver as `0x${string}`,
      owner as `0x${string}`,
    ],
    chain: ethereum,
  })
}

export async function vaultMint(params: {
  account: string
  shares: bigint
  receiver: string
}) {
  const {
    account,
    shares,
    receiver,
  } = params

  return await sendContractTransaction({
    account,
    address: ETH_YIELD_VAULT_ADDRESS,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'mint',
    args: [shares, receiver as `0x${string}`],
    chain: ethereum,
  })
}

export async function vaultRedeem(params: {
  account: string
  shares: bigint
  receiver: string
  owner: string
}) {
  const {
    account,
    shares,
    receiver,
    owner,
  } = params

  return await sendContractTransaction({
    account,
    address: ETH_YIELD_VAULT_ADDRESS,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'redeem',
    args: [
      shares,
      receiver as `0x${string}`,
      owner as `0x${string}`,
    ],
    chain: ethereum,
  })
}

export async function vaultHarvest(params: {
  account: string
  tokenId: bigint
}) {
  const { account, tokenId } = params

  return await sendContractTransaction({
    account,
    address: ETH_YIELD_VAULT_ADDRESS,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'harvest',
    args: [tokenId],
    chain: ethereum,
  })
}

export async function vaultStakeIntoFarm(params: {
  account: string
  tokenId: bigint
}) {
  const { account, tokenId } = params

  return await sendContractTransaction({
    account,
    address: ETH_YIELD_VAULT_ADDRESS,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'stakeIntoFarm',
    args: [tokenId],
    chain: ethereum,
  })
}

export async function vaultWithdrawFromFarm(params: {
  account: string
  tokenId: bigint
}) {
  const { account, tokenId } = params

  return await sendContractTransaction({
    account,
    address: ETH_YIELD_VAULT_ADDRESS,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'withdrawFromFarm',
    args: [tokenId],
    chain: ethereum,
  })
}

export async function vaultPreviewDeposit(assets: bigint) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'previewDeposit',
    args: [assets],
  })
}

export async function vaultPreviewMint(shares: bigint) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'previewMint',
    args: [shares],
  })
}

export async function vaultPreviewRedeem(shares: bigint) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'previewRedeem',
    args: [shares],
  })
}

export async function vaultPreviewWithdraw(assets: bigint) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'previewWithdraw',
    args: [assets],
  })
}

export async function vaultConvertToAssets(shares: bigint) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'convertToAssets',
    args: [shares],
  })
}

export async function vaultConvertToShares(assets: bigint) {
  return await ETHEREUM_PUBLIC_CLIENT.readContract({
    address: ETH_YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: ETH_YIELD_VAULT_ABI,
    functionName: 'convertToShares',
    args: [assets],
  })
}

export async function waitForTransactionReceipt(hash: `0x${string}`) {
  return await ROBINHOOD_PUBLIC_CLIENT.waitForTransactionReceipt({ hash })
}

export async function waitForEthereumTransactionReceipt(hash: `0x${string}`) {
  return await ETHEREUM_PUBLIC_CLIENT.waitForTransactionReceipt({ hash })
}

export async function bridgeUSDGToUSDC(
  amount: bigint,
  fromAddress: string,
  toAddress: string,
): Promise<{ txHash: string; amountOut: bigint }> {
  const deadline = Math.floor(Date.now() / 1000) + 600

  const resp = await fetch(KYBERSWAP_CROSS_CHAIN_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': X_CLIENT_ID,
    },
    body: JSON.stringify({
      chainId: 4663,
      tokenIn: CONTRACTS.robinhood.stableCoin,
      tokenOut: CONTRACTS.ethereum.usdc,
      amountIn: amount.toString(),
      recipient: toAddress,
      deadline,
      source: 'ai-agent-skills',
    }),
  })

  if (!resp.ok) throw new Error(`Bridge quote failed: ${resp.status}`)
  const json = await resp.json()
  if (json.code !== 0) throw new Error(json.message || 'Bridge quote failed')

  const quote = json.data

  const buildResp = await fetch(`${KYBERSWAP_CROSS_CHAIN_API}/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': X_CLIENT_ID,
    },
    body: JSON.stringify({
      quoteId: quote.quoteId,
      sender: fromAddress,
      receiver: toAddress,
      slippageTolerance: 50,
      deadline,
      source: 'ai-agent-skills',
    }),
  })

  if (!buildResp.ok) throw new Error(`Bridge build failed: ${buildResp.status}`)
  const buildJson = await buildResp.json()
  if (buildJson.code !== 0) throw new Error(buildJson.message || 'Bridge build failed')

  const tx = buildJson.data

  const txHash = await sendRawTransaction({
    account: fromAddress as `0x${string}`,
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: tx.value ? BigInt(tx.value) : 0n,
    gas: tx.gas ? BigInt(tx.gas) : undefined,
  })

  const receipt = await waitForTransactionReceipt(txHash as `0x${string}`)
  if (receipt.status !== 'success') throw new Error('Bridge transaction reverted')

  return {
    txHash,
    amountOut: BigInt(quote.amountOut || '0'),
  }
}

export async function waitForAllowance(
  owner: `0x${string}`,
  spender: `0x${string}`,
  required: bigint,
  tokenAddress: string,
  maxAttempts: number = 5,
): Promise<bigint> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const allowance = await getAllowance({
      tokenAddress,
      owner,
      spender,
    })

    console.log('[DepositPanel] allowance poll', {
      attempt,
      token: tokenAddress,
      owner,
      spender,
      allowance: allowance.toString(),
      required: required.toString(),
    })

    if (allowance >= required) return allowance

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error('Approval mined, but allowance remained insufficient')
}

export async function initSDK() {
  try {
    await sdk.actions.ready()
  } catch (err) {
    console.error('SDK init failed:', err)
  }
}