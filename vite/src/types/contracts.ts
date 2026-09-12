// Contract interfaces generated from ABIs

// BotYieldPass interface (ERC1155)
export interface BotYieldPass {
  functions: {
    balanceOf: (
      parameters: {
        account: string
        id: bigint
      }
    ) => Promise<bigint>
    balanceOfBatch: (
      parameters: {
        accounts: string[]
        ids: bigint[]
      }
    ) => Promise<bigint[]>
  }
  events: {
    TransferSingle: (
      parameters: {
        operator: string
        from: string
        to: string
        id: bigint
        value: bigint
        role: `0x${string}`
      }
    ) => void
    TransferBatch: (
      parameters: {
        operator: string
        from: string
        to: string
        ids: bigint[]
        values: bigint[]
        role: `0x${string}`
      }
    ) => void
  }
}

// BotRewardClaims interface
export interface BotRewardClaims {
  functions: {
    claimRewards: (
      parameters: {
        user: string
        grossAmount: bigint
        claimId: bigint
      }
    ) => Promise<void>
    depositRewards: (
      parameters: {
        amount: bigint
      }
    ) => Promise<void>
    claimableBalance: (
      parameters: {
        user: string
      }
    ) => Promise<bigint>
    balances: (
      parameters: {
        user: string
      }
    ) => Promise<bigint>
  }
  events: {
    RewardsClaimed: (
      parameters: {
        claimId: bigint
        user: string
        amount: bigint
        timestamp: bigint
      }
    ) => void
    RewardsDeposited: (
      parameters: {
        amount: bigint
        timestamp: bigint
      }
    ) => void
  }
}

// EthYieldVault interface
export interface EthYieldVault {
  functions: {
    // Add functions based on deployment script
  }
}

// Token interfaces
export interface ERC20 {
  functions: {
    balanceOf: (
      parameters: {
        owner: string
      }
    ) => Promise<bigint>
    allowance: (
      parameters: {
        owner: string
        spender: string
      }
    ) => Promise<bigint>
    approve: (
      parameters: {
        spender: string
        amount: bigint
      }
    ) => Promise<void>
    transfer: (
      parameters: {
        to: string
        amount: bigint
      }
    ) => Promise<boolean>
  }
}

export interface ERC1155 {
  functions: {
    balanceOf: (
      parameters: {
        account: string
        id: bigint
      }
    ) => Promise<bigint>
    balanceOfBatch: (
      parameters: {
        accounts: string[]
        ids: bigint[]
      }
    ) => Promise<bigint[]>
    isApprovedForAll: (
      parameters: {
        account: string
        operator: string
      }
    ) => Promise<boolean>
    setApprovalForAll: (
      parameters: {
        operator: string
        approved: boolean
      }
    ) => Promise<void>
  }
}