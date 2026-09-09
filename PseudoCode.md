// === Known mainnet addresses from your tx ===
POSITION_MANAGER = 0xbD216513d74C8cf14cf4747E6AaA6420FF64ee9e  // Uniswap v4 PositionManager (NFT)
KYBER_FARM       = 0x51F16AC6345d21DfD9d54ee9d36D5aCC66225cfE  // Kyber Elastic farm
KYBER_ROUTER     = 0x098697bA3Fee4eA76294C5d6A466a4e3b3E95FE6  // Kyber router/aggregator
WETH             = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
USDC             = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

// === Keeper off-chain ===
keeper.onRebalance(amountUSDC):
    strat   = read BotStrategyRegistry.getStrategy()  // BOT Chain
    quote   = GET  zap-api.kyberswap.com/ethereum/api/v1/in/route
              ?tokensIn=USDC&amountsIn=amount&pool=strat.pool
              &tickLower=...&tickUpper=...&slippage=strat.maxSlippageBps
    built   = POST .../api/v1/in/route/build  (sender=vault)
    assert built.routerAddress == KYBER_ROUTER or in vault.whitelist
    send tx: vault.operatorZapIn(built.routerAddress, built.calldata, deadline)

// === Inside EthYieldVault (Ethereum) ===
vault.operatorZapIn(router, calldata, deadline):
    require router is whitelisted
    require now <= deadline
    execute router.call(calldata)          // zap mints Uniswap v4 position NFT to vault
    tokenId = newly minted NFT id          // detect via PositionManager balance delta or event

vault.stakeIntoFarm(tokenId):
    IERC721(POSITION_MANAGER).approve(KYBER_FARM, tokenId)
    IKyberFarm(KYBER_FARM).deposit(tokenId)   // step 1: custody
    IKyberFarm(KYBER_FARM).stake(tokenId)     // step 2: REQUIRED to earn rewards

keeper.harvestLoop():
    IKyberFarm(KYBER_FARM).harvest(tokenId)   // claim rewards
    // convert rewards → USDC/USDT → bridge to BOT Chain → fund BotRewardClaims