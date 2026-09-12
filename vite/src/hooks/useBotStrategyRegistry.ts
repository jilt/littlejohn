import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { botchain } from '../chains'
import { CONTRACTS } from '../config/contracts'
import type { BotStrategyRegistry } from '../types/contracts'

export function useBotStrategyRegistry() {
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

  const { writeContract, isPending, error: writeError } = useWriteContract()

  const setStrategy = (params: {
    ethChainId: bigint
    ethVault: string
    pool: string
    farm: string
    slippage: bigint
    description: string
  }) => {
    writeContract({
      address: CONTRACTS.botChain.botStrategyRegistry,
      abi: [{
        name: 'setStrategy',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: '_ethChainId', type: 'uint256' },
          { name: '_ethVault', type: 'address' },
          { name: '_pool', type: 'address' },
          { name: '_farm', type: 'address' },
          { name: '_slippage', type: 'uint256' },
          { name: '_description', type: 'string' }
        ],
        outputs: []
      }],
      functionName: 'setStrategy',
      args: [params.ethChainId, params.ethVault, params.pool, params.farm, params.slippage, params.description],
      chainId: botchain.id
    })
  }

  return {
    strategy,
    isLoading,
    error,
    setStrategy,
    isPending,
    writeError
  }
}