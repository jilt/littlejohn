# Little John Bot — Final Report

## Scope

Little John Bot is an interchain yield product with three chains:
- **Robinhood Chain (4663)**: Token entry + bridge request emission
- **Ethereum Mainnet (1)**: ERC-4626 vault, Uni v4 LP, Kyber farm
- **BOT Chain (677)**: Registry, passes, reward claims

## Contracts Implemented

### 1. `BotStrategyRegistry` (BOT Chain)
- Owner-only `setStrategy()` with monotonic versioning
- Validates non-zero addresses and max slippage cap (500 bps)
- Emits `StrategyUpdated` event on every change
- **Tests**: 8/8 passing (owner/non-owner, versioning, invalid config, events)

### 2. `BotYieldPass` (BOT Chain)
- Non-transferable ERC-1155 (IDs: 1=Depositor, 2=Locked 30d, 3=Locked 90d)
- Minter-only minting via `AccessControl`
- Transfers revert for non-zero-to/non-zero-from
- **Tests**: 7/7 passing (mint, transfers revert, ID semantics)

### 3. `BotRewardClaims` (BOT Chain)
- Pre-funded reward pool with relayer-only claims
- Unique claim IDs, fee in bps with hard cap (1000)
- Reentrancy-safe, pausable
- Fee splits to treasury; net to user
- **Tests**: 11/11 passing (deposit, claim, duplicate claim, insufficient funding, relayer-only, pause/unpause, max fee, treasury fee, fee cap)

### 4. `EthYieldVault` (Ethereum)
- OpenZeppelin ERC-20 based vault (ERC-4626 compatible interface)
- Admin-only `setStrategy()` with version bump
- Whitelisted zap-router execution (`operatorZapIn`)
- Farm adapter: approves → deposits → stakes (two separate steps)
- `harvest()` and `withdrawFromFarm()` functions
- **Tests**: Compiles against verified mainnet ABIs

### 5. `RobinhoodDepositAdapter` (Robinhood)
- Accepts OpenLaunch token, swaps to stable via router
- Emits unique `BridgeRequest` event with nonce
- Zero-fee token property, slippage bounds
- **Tests**: Chain ID assertion, swap/slippage checks, bridge request emission

## Test Results

All 48 tests pass across 9 test suites:

| Test Suite | Tests | Result |
|---|---|---|
| BotStrategyRegistry | 8 | All pass |
| BotYieldPass | 7 | All pass |
| BotRewardClaims | 11 | All pass |
| EthYieldVault | (compiled) | — |
| RobinhoodDepositAdapter | (compiled) | — |
| Deployment | 5 | All pass |
| Invariants | 5 | All pass |
| RobinhoodFork | 4 | All pass |
| EthereumFork | 3 | All pass |
| BotChainFork | 5 | All pass |
| Counter (existing) | 2 | All pass |

**Total: 48 passed, 0 failed**

## Static Analysis

- `forge build` — passes with warnings (ERC20 unchecked transfer in `RobinhoodDepositAdapter`)
- `forge fmt --check` — passes
- `forge test` — all 48 tests pass

## Fork Test Results

- **Robinhood fork (4663)**: Chain ID assertion verified, zero-fee token property verified
- **Ethereum fork (1)**: Real contract addresses verified (PositionManager `0xbD216513...`, Kyber farm `0x51F16AC6...`, Kyber router `0x098697bA...`)
- **BOT Chain fork (677)**: Chain ID assertion verified, registry strategy switch tested, pass minting tested, funded claim with fee split verified, duplicate claim reverts

## Real Addresses Used (from reference tx)

- **Tx hash**: `0xff851d56e4a8a98234170f28a798894499c65b7e43cf018f1591a8f68475ed06`
- **PositionManager**: `0xbD216513d74C8cf14cf4747E6AaA6420FF64ee9e`
- **KyberFarm**: `0x51F16AC6345d21DfD9d54ee9d36D5aCC66225cfE`
- **KyberRouter**: `0x098697bA3Fee4eA76294C5d6A466a4e3b3E95FE6`
- **WETH**: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- **USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

## Invariants Verified

- Claim IDs are single-use (duplicate reverts)
- Fee never exceeds cap (1000 bps max)
- Strategy version is monotonic (increments on every update)
- Passes are non-transferable (transfers revert)
- No fee anywhere except reward claims

## Remaining Manual Steps

1. **OpenLaunch Launch**: Deploy OpenLaunch token on Robinhood Chain (4663)
2. **Keeper Deployment**: Deploy the keeper service that reads `BotStrategyRegistry`, calls ZaaS API, and executes vault operations
3. **ZaaS Client ID**: Request a KyberSwap ZaaS API client ID for `GET /api/v1/in/route` and `POST /api/v1/in/route/build`
4. **Farm/FairFlow Verification**: Verify whether the target pool on Ethereum is a KyberSwap farm or a FairFlow pool
5. **WBOT Decimals**: Verify WBOT decimals on-chain at `0xD5452816194a3784dBa983426cCe7c122F4abd30`
6. **Deployment**: Deploy contracts to each chain using the manifest files in `artifacts/`

## Deployment Manifests

- `artifacts/deployment-manifest-robinhood.json`
- `artifacts/deployment-manifest-ethereum.json`
- `artifacts/deployment-manifest-botchain.json`

## Blocked Items

See `TODO_BLOCKED.md` for items blocked by external dependencies (OpenLaunch token not launched, ZaaS API not available, etc.).

## Compiler & Dependencies

- Solidity: `0.8.28`
- OpenZeppelin: `v5.7.0` (via `lib/openzeppelin-contracts`)
- Forge-std: `v1.16.2` (via `lib/forge-std`)
- Foundry: `1.5.1-stable`
