import { useReadContract } from 'wagmi'
import { botchain } from '../chains'
import { CONTRACTS } from '../config/contracts'

export function useBotStrategy() {
  const { data: strategy, isLoading, error } = useReadContract({
    address: CONTRACTS.botChain.botStrategyRegistry,
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