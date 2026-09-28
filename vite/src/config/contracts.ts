import { ROBINHOOD_ADAPTER_ABI } from './robinhoodAdapterABI'

export const WETH = '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73'

export const ROBINHOOD_ROUTER = '0x8876789976dEcBfCbBbe364623C63652db8C0904'

export const ROBINHOOD_LJB_TOKEN = '0xF0C81b03A33463272a5466AfAeD628989A030F82'

export const ROBINHOOD_ADAPTER_ADDRESS = '0xC36A19b8910273Cf4a030EA5612e63B66fBfeA03'

export const USDG_ETHEREUM = '0xe343167631d89B6Ffc58B88d6b7fB0228795491D'

export const CONTRACTS = {
  botChain: {
    botStrategyRegistry: '0xc30058704D917e050d84999bd93a16a2e7C1B893',
    botYieldPass: '0x2dD67797F0c9Db63500992819827aBC2E3932A22',
    botRewardClaims: '0xF8296c312e5E349184988Dd8C8e87Dc05e65FCa8',
    stableCoin: '0xF0C81b03A33463272a5466AfAeD628989A030F82',
  },
  ethereum: {
    ethYieldVault: '0xc30058704D917e050d84999bd93a16a2e7C1B893',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdg: USDG_ETHEREUM,
  },
  robinhood: {
    WETH,
    ethYieldVault: '0xc30058704D917e050d84999bd93a16a2e7C1B893',
    ljbToken: ROBINHOOD_LJB_TOKEN,
    stableCoin: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
    router: ROBINHOOD_ROUTER,
    adapter: ROBINHOOD_ADAPTER_ADDRESS,
    adapterAbi: ROBINHOOD_ADAPTER_ABI,
  },
}

export const BLOCK_EXPLORERS = {
  botChain: 'https://scan.botchain.ai',
  ethereum: 'https://etherscan.io',
  robinhood: 'https://robinhoodchain.blockscout.com',
}

export const CHAIN_IDS = {
  botChain: 677,
  ethereum: 1,
  robinhood: 4663,
}
