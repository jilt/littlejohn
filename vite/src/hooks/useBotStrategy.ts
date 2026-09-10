import { useReadContract } from 'wagmi'
import { botchain } from '../chains'

const BOT_STRATEGY_REGISTRY_ADDRESS = '0x0000000000000000000000000000000000000000' // Update after deployment

export function useBotStrategy() {
  const { data: strategy, isLoading, error } = useReadContract({
    address: BOT_STRATEGY_REGISTRY_ADDRESS,
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