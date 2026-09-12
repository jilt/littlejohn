import { useReadContract } from 'wagmi'
import { botchain } from '../chains'
import { CONTRACTS } from '../config/contracts'

export function useBotStrategy() {
  const zeroAddr = '0x000000000000000000000000000000000000' as `0x${string}`
  const readAddress = (CONTRACTS.botChain.botStrategyRegistry || zeroAddr) as `0x${string}`
  const { data: strategy, isLoading, error } = useReadContract({
    address: readAddress,
    abi: [{
      name: 'strategy',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [
        { name: 'ethChainId', type: 'uint256' },
        { name: 'ethVault', type: 'address' },
        { name: 'pool', type: 'address' },
        { name: 'farm', type: 'address' },
        { name: 'slippage', type: 'uint256' },
        { name: 'version', type: 'uint256' },
        { name: 'description', type: 'string' }
      ]
    }],
    functionName: 'strategy',
    chainId: botchain.id
  })

  return { strategy, isLoading, error }
}