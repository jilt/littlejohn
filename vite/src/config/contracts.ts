// Contract addresses from deployment
export const CONTRACTS = {
  // BOT Chain contracts
  botChain: {
    botStrategyRegistry: '0xc30058704D917e050d84999bd93a16a2e7C1B893',
    botYieldPass: '0x2dD67797F0c9Db63500992819827aBC2E3932A22', // Also the ERC1155 contract
    botRewardClaims: '0xF8296c312e5E349184988Dd8C8e87Dc05e65FCa8',
    ljbToken: '0xF0C81b03A33463272a5466AfAeD628989A030F82', // USDC on BOT Chain (ERC20)
  },
  // Ethereum Mainnet contracts
  ethereum: {
    ethYieldVault: '0xc30058704D917e050d84999bd93a16a2e7C1B893',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
  },
  // Robinhood Chain contracts
  robinhood: {
    ethYieldVault: '0xc30058704D917e050d84999bd93a16a2e7C1B893',
    ljbToken: '0xF0C81b03A33463272a5466AfAeD628989A030F82', // LJB token on Robinhood
    stableCoin: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // USDC on Robinhood (simplified)
    router: '0x7a250d5630B4cF539739dF911AfDad5B9137f0b0', // Uniswap router (example)
  },
}

// Block explorers
export const BLOCK_EXPLORERS = {
  botChain: 'https://scan.botchain.ai',
  ethereum: 'https://etherscan.io',
  robinhood: 'https://robinhoodchain.blockscout.com',
}

// Default chain IDs
export const CHAIN_IDS = {
  botChain: 677,
  ethereum: 1,
  robinhood: 4663,
}