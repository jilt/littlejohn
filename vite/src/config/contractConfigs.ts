// BotYieldPass contract configuration
export const BOT_YIELD_PASS_CONFIG = {
  address: '0x2dD67797F0c9Db63500992819827aBC2E3932A22',
  chainId: 677, // BOT Chain
  blockExplorer: 'https://scan.botchain.ai',
  isERC1155: true,
  functions: {
    balanceOf: {
      name: 'balanceOf',
      inputs: [
        { name: 'account', type: 'address' },
        { name: 'id', type: 'uint256' }
      ],
      outputs: [{ name: 'balance', type: 'uint256' }]
    },
    balanceOfBatch: {
      name: 'balanceOfBatch',
      inputs: [
        { name: 'accounts', type: 'address[]' },
        { name: 'ids', type: 'uint256[]' }
      ],
      outputs: [{ name: 'balances', type: 'uint256[]' }]
    }
  }
}

// BotRewardClaims contract configuration
export const BOT_REWARD_CLAIMS_CONFIG = {
  address: '0xF8296c312e5E349184988Dd8C8e87Dc05e65FCa8',
  chainId: 677, // BOT Chain
  blockExplorer: 'https://scan.botchain.ai',
  functions: {
    claimRewards: {
      name: 'claimRewards',
      inputs: [
        { name: 'user', type: 'address' },
        { name: 'grossAmount', type: 'uint256' },
        { name: 'claimId', type: 'uint256' }
      ]
    },
    depositRewards: {
      name: 'depositRewards',
      inputs: [
        { name: 'amount', type: 'uint256' }
      ]
    },
    claimableBalance: {
      name: 'balances',
      inputs: [
        { name: 'user', type: 'address' }
      ],
      outputs: [{ name: 'balance', type: 'uint256' }]
    }
  }
}

// EthYieldVault contract configuration
export const ETH_YIELD_VAULT_CONFIG = {
  address: '0xc30058704D917e050d84999bd93a16a2e7C1B893',
  chainId: 1, // Ethereum Mainnet
  blockExplorer: 'https://etherscan.io',
  functions: {
    deposit: {
      name: 'deposit',
      inputs: [
        { name: 'assets', type: 'uint256' },
        { name: 'receiver', type: 'address' }
      ]
    },
    withdraw: {
      name: 'withdraw',
      inputs: [
        { name: 'assets', type: 'uint256' },
        { name: 'receiver', type: 'address' },
        { name: 'owner', type: 'address' }
      ]
    }
  }
}

// LJB Token (ERC20) configuration
export const LJB_TOKEN_CONFIG = {
  address: '0xF0C81b03A33463272a5466AfAeD628989A030F82',
  chainId: 677, // BOT Chain
  blockExplorer: 'https://scan.botchain.ai',
  functions: {
    balanceOf: {
      name: 'balanceOf',
      inputs: [
        { name: 'owner', type: 'address' }
      ],
      outputs: [{ name: 'balance', type: 'uint256' }]
    },
    transfer: {
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: 'success', type: 'bool' }]
    }
  }
}