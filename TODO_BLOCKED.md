# TODO_BLOCKED.md

## Blocked Items

### 2026-09-09

1. **OpenLaunch Token Not Launched**: The OpenLaunch token on Robinhood Chain (4663) has not been launched yet. `RobinhoodDepositAdapter` is written and tested but cannot perform end-to-end swap-to-stable without the token contract.

2. **Keeper ZaaS API Not Available**: The KyberSwap ZaaS API (`zap-api.kyberswap.com`) is not available in fork mode. The keeper-built-calldata pattern is documented in `PseudoCode.md` but cannot be end-to-end tested without the API client ID.

3. **WBOT Decimals Not Verified**: WBOT address `0xD5452816194a3784dBa983426cCe7c122F4abd30` on BOT Chain (677) needs on-chain verification of decimals.

4. **FairFlow Pool Verification**: The target pool on Ethereum may be a FairFlow pool (no farm contract). If so, the farm adapter pattern in `EthYieldVault` needs to be adjusted. Current implementation assumes a KyberSwap farm exists.

5. **OpenLaunch Token Launch**: The `RobinhoodDepositAdapter` requires the OpenLaunch token to be launched on Robinhood Chain before it can accept deposits and perform swap-to-stable operations.

6. **Keeper Deployment**: The keeper service that reads from `BotStrategyRegistry`, calls the ZaaS API, and executes vault operations has not been deployed.

7. **ZaaS Client ID Request**: A KyberSwap ZaaS API client ID is needed for the keeper to call `GET /api/v1/in/route` and `POST /api/v1/in/route/build`.

## Notes

- All contracts are implemented and tested on mainnet forks.
- No real funds, private keys, or mainnet broadcasts are used.
- The integration sequence (zap → LP → farm) is verified against tx `0xff851d56e4a8a98234170f28a798894499c65b7e43cf018f1591a8f68475ed06`.
- The KyberSwap farm requires separate `deposit()` and `stake()` calls, both implemented in `EthYieldVault.stakeIntoFarm()`.
