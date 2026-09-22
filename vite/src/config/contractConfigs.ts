import { ETH_YIELD_VAULT_ABI } from './ethYieldVaultABI'
import { ROBINHOOD_ADAPTER_ADDRESS, ROBINHOOD_ADAPTER_ABI, USDG_ETHEREUM } from './contracts'

// Robinhood Deposit Adapter configuration
export const ROBINHOOD_ADAPTER_CONFIG = {
  address: ROBINHOOD_ADAPTER_ADDRESS,
  chainId: 4663,
  blockExplorer: 'https://robinhoodchain.blockscout.com',
  abi: ROBINHOOD_ADAPTER_ABI,
  functions: {
    depositAndBridge: {
      name: 'depositAndBridge',
      inputs: [
        { name: 'amount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
      ],
      outputs: [{ name: 'requestId', type: 'uint256' }],
    },
  },
}

// USDG Token (Ethereum) configuration
export const USDG_ETHEREUM_CONFIG = {
  address: USDG_ETHEREUM,
  chainId: 1,
  blockExplorer: 'https://etherscan.io',
  functions: {
    balanceOf: {
      name: 'balanceOf',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256' }],
    },
  },
}

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
  abi: ETH_YIELD_VAULT_ABI,
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

// LJB Token (ERC20) configuration on Robinhood Chain
export const LJB_TOKEN_CONFIG = {
  address: '0xf0c81b03a33463272a5466afaed628989a030f82',
  chainId: 4663,
  blockExplorer: 'https://robinhoodchain.blockscout.com',
  functions: {
    balanceOf: {
      name: 'balanceOf',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256' }],
    },
    allowance: {
      name: 'allowance',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ name: 'value', type: 'uint256' }],
    },
  },
}