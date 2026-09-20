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
    balanceOf: (params: { account: string }) => Promise<bigint>
    totalAssets: () => Promise<bigint>
    deposit: (params: { assets: bigint; receiver: string }) => Promise<void>
    withdraw: (params: { assets: bigint; receiver: string; owner: string }) => Promise<void>
    mint: (params: { shares: bigint; receiver: string }) => Promise<void>
    redeem: (params: { shares: bigint; receiver: string; owner: string }) => Promise<void>
    harvest: (params: { tokenId: bigint }) => Promise<void>
    stakeIntoFarm: (params: { tokenId: bigint }) => Promise<void>
    withdrawFromFarm: (params: { tokenId: bigint }) => Promise<void>
    previewDeposit: (params: { assets: bigint }) => Promise<bigint>
    previewMint: (params: { shares: bigint }) => Promise<bigint>
    previewRedeem: (params: { shares: bigint }) => Promise<bigint>
    previewWithdraw: (params: { assets: bigint }) => Promise<bigint>
    convertToAssets: (params: { shares: bigint }) => Promise<bigint>
    convertToShares: (params: { assets: bigint }) => Promise<bigint>
    strategy: () => Promise<any>
    owner: () => Promise<string>
    paused: () => Promise<boolean>
    asset: () => Promise<string>
    name: () => Promise<string>
    symbol: () => Promise<string>
    decimals: () => Promise<number>
    totalSupply: () => Promise<bigint>
  }
  events: {
    Deposit: (params: { sender: string; owner: string; assets: bigint; shares: bigint }) => void
    Withdraw: (params: { sender: string; receiver: string; owner: string; assets: bigint; shares: bigint }) => void
    ZapIn: (params: { router: string; amount: bigint; tokenId: bigint }) => void
    FarmDeposited: (params: { tokenId: bigint }) => void
    FarmStaked: (params: { tokenId: bigint }) => void
    FarmHarvested: (params: { tokenId: bigint; rewards: bigint }) => void
    StrategySet: (params: { version: bigint; pool: string; farm: string; slippage: bigint; description: string }) => void
    OperatorChanged: (params: { oldOperator: string; newOperator: string }) => void
    RouterWhitelisted: (params: { router: string; status: boolean }) => void
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