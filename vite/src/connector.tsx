import { createContext, useState, useCallback, useEffect } from 'react'
import { createPublicClient, createWalletClient, http, custom } from 'viem'
import { sdk } from '@farcaster/miniapp-sdk'
import { robinhood } from './chains'

const PUBLIC_CLIENT = createPublicClient({
  chain: robinhood,
  transport: http(),
})

function getWalletClient(account?: string) {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No Ethereum provider found')
  }
  return createWalletClient({
    chain: robinhood,
    transport: custom((window as any).ethereum),
    ...(account ? { account: account as `0x${string}` } : {}),
  })
}

interface WalletContextType {
  address: string | undefined
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
}

export const WalletContext = createContext<WalletContextType>({
  address: undefined,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  switchChain: async () => {},
})

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string>()
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(async () => {
    try {
      const client = getWalletClient()
      const accounts = await client.requestAddresses()
      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
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
          }
        }
      } catch {}
    }
    checkExistingConnection()
  }, [])

  const disconnect = useCallback(() => {
    setAddress(undefined)
    setIsConnected(false)
  }, [])

  const switchChain = useCallback(async (chainId: number) => {
    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    })
  }, [])

  return (
    <WalletContext.Provider value={{ address, isConnected, connect, disconnect, switchChain }}>
      {children}
    </WalletContext.Provider>
  )
}

export async function getContractBalance(params: { address: string; abi: any; functionName: string; args: any[]; chain: any }) {
  const { address, abi, functionName, args, chain } = params
  return await PUBLIC_CLIENT.readContract({
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
    chain,
  })
}

export async function sendContractTransaction(params: {
  account: string
  address: string
  abi: any
  functionName: string
  args: any[]
  value?: bigint
  gas?: bigint
}) {
  const {
    account,
    address,
    abi,
    functionName,
    args,
    value,
    gas,
  } = params

  const client = getWalletClient(account)

  return client.writeContract({
    account: account as `0x${string}`,
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
    value,
    ...(gas !== undefined ? { gas } : {}),
    chain: robinhood,
  })
}

export async function sendRawTransaction(params: {
  account: `0x${string}`
  to: `0x${string}`
  data: `0x${string}`
  value?: bigint
  gas?: bigint
}) {
  const {
    account,
    to,
    data,
    value = 0n,
    gas,
  } = params

  const client = getWalletClient(account)

  const walletChainHex = await (window as any).ethereum.request({
    method: 'eth_chainId',
  })

  const walletChainId = Number.parseInt(walletChainHex, 16)

  if (walletChainId !== robinhood.id) {
    throw new Error(
      `Wallet is on chain ${walletChainId}; expected ${robinhood.id}.`,
    )
  }

  const gasLimit =
    gas ??
    await PUBLIC_CLIENT.estimateGas({
      account,
      to,
      data,
      value,
    })

  return client.sendTransaction({
    account,
    to,
    data,
    value,
    gas: (gasLimit * 120n) / 100n,
    chain: robinhood,
  })
}

export { PUBLIC_CLIENT, getWalletClient }

export async function initSDK() {
  try {
    await sdk.actions.ready()
  } catch (err) {
    console.error('SDK init failed:', err)
  }
}