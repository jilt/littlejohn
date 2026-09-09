# GOAL — Little John Bot (opencode goal plugin)

## Objective

Build the minimal, test-verified version of **Little John Bot**: an interchain yield product where users deposit an OpenLaunch token (Robinhood Chain 4663), capital is converted to stablecoins and bridged to Ethereum mainnet, an ERC-4626 vault deploys it into one configured Uniswap v4 stablecoin pool and stakes the position in the corresponding KyberSwap farm, and BOT Chain (677) hosts only the strategy registry, non-transferable ERC-1155 locking certifications, and reward claims with the protocol's only fee.

## Hard constraints

- No governance, timelocks, voting, migration contracts, referral systems, campaigns, or second farms.
- No real funds, no real private keys, no mainnet broadcasts. Forks and impersonation only.
- No unverified external addresses. Unknown ABI/address → write to TODO_BLOCKED.md and move on.
- Never represent a mocked bridge hop as completed cross-chain settlement.
- The OpenLaunch token stays 0% fee. The vault charges 0%. The only fee is on reward claims.
- One active strategy at a time. Strategy change = admin pointer update; capital movement is the operator's job, never automatic in-contract.
- The KyberSwap ZaaS API is HTTP-only: a vault cannot call it. Use the keeper-built-calldata pattern.
- A KyberSwap farm position requires deposit AND stake as separate steps; depositing the position NFT alone earns no rewards.
- If the target pool turns out to be a FairFlow pool (no farm contract), do not invent a farm; record it in TODO_BLOCKED.md.
- Pin compiler and dependency versions. Small reversible commits.

## Networks

| Chain | Chain ID | Role | RPC env var | Explorer |
|---|---|---|---|---|
| Robinhood | 4663 | Token entry + bridge request emission | ROBINHOOD_RPC_URL | robinhoodchain.blockscout.com |
| Ethereum | 1 | ERC-4626 vault, Uni v4 LP, Kyber farm | ETHEREUM_RPC_URL | etherscan.io |
| BOT Chain | 677 | Registry, passes, reward claims | BOTCHAIN_RPC_URL | scan.botchain.ai |

Known BOT Chain assets: USDT `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C`, WBOT `0xD5452816194a3784dBa983426cCe7c122F4abd30` (verify decimals on-chain).

## Reference implementation: real tx to reverse-engineer

Use this Ethereum mainnet transaction as the **ground truth** for the zap → LP → farm flow. The agent must reproduce this behavior in tests on a mainnet fork.

**Tx hash:** `0xff851d56e4a8a98234170f28a798894499c65b7e43cf018f1591a8f68475ed06`

**Key addresses from the tx:**

- **Uniswap v4 PositionManager (ERC-721 NFT):**  
  `0xbD216513d74C8cf14cf4747E6AaA6420FF64ee9e`
- **KyberSwap Elastic farm:**  
  `0x51F16AC6345d21DfD9d54ee9d36D5aCC66225cfE`
- **Kyber router / aggregator:**  
  `0x098697bA3Fee4eA76294C5d6A466a4e3b3E95FE6`
- **WETH:**  
  `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- **USDC:**  
  `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **User address in example tx:**  
  `0x3bdB21Ea8793AcBF0cE18954865b7572694d037f`

**Required behavior to match:**

1. The tx mints a Uniswap v4 position NFT (ERC-721) from `0xbD216513...` to the user/vault.
2. The position NFT is deposited into the Kyber farm `0x51F16AC6...`.
3. The position NFT is staked in the same farm (separate call) to earn rewards.
4. The router `0x098697bA...` handles the zap/swap into the correct token ratio before minting the LP position.

The agent must:

- Load this tx on a mainnet fork.
- Decode the call sequence (router → PositionManager → farm).
- Reproduce the same sequence in `test/EthereumFork.t.sol` using impersonation and the same contracts.
- Assert that depositing the NFT without staking earns zero rewards (per Kyber docs).

## Contract responsibilities (no implementation in this file)

- `EthYieldVault` (Ethereum): OpenZeppelin ERC-4626 over one canonical stablecoin asset (USDC or USDT). Admin-only `setStrategy(pool, farm, slippage, description)` that updates config and bumps version but never moves funds. Whitelisted zap-router execution entry point callable only by the operator. Farm adapter that approves, deposits, and stakes the position NFT (two separate steps), harvests, and claims (handle vesting if present). `totalAssets()` = idle assets + LP position value + claimable farm rewards. Withdrawals unwind LP when idle liquidity is insufficient. Pause and withdraw-only modes. Reentrancy protection.
- `RobinhoodDepositAdapter` (Robinhood): accepts the OpenLaunch token, swaps to stable via best available route, emits a unique `BridgeRequest` event. No cross-chain settlement claims.
- `BotStrategyRegistry` (BOT Chain): owner-set strategy pointer (ethChainId, ethVault, pool, farm, slippage, version, description). Holds no funds. Emits full config on every update. Version is monotonic.
- `BotYieldPass` (BOT Chain): non-transferable ERC-1155. IDs: 1 Depositor, 2 Locked 30d, 3 Locked 90d. Minter role only.
- `BotRewardClaims` (BOT Chain): pre-funded reward pool. Relayer-only `claimRewards(user, grossAmount, claimId)`. Unique claim IDs, fee in bps with hard cap, fee to treasury, net to user, reentrancy-safe, pausable.

## Integration sequence (USDT/USDC → LP → farm, strategy updatable from BOT Chain)

1. Keeper reads active strategy from `BotStrategyRegistry` on BOT Chain.
2. Keeper calls ZaaS `GET /api/v1/in/route` on Ethereum with input USDC/USDT, target pool, and tick range; then `POST /api/v1/in/route/build` to obtain calldata and the zap router address.
3. Keeper calls the vault's operator-only execute function with (router, calldata); the vault validates the router against its whitelist and executes, so the position NFT is minted to the vault.
4. Vault approves the farming contract for the position NFT.
5. Vault deposits the NFT into the farming contract.
6. Vault stakes the deposited NFT into the farm. This is a separate required step.
7. Keeper harvests periodically; if the farm has vesting, the claim step runs after unlock.
8. Rewards are converted to the BOT-chain reward token off-chain/by keeper and used to fund `BotRewardClaims`; users claim with the claim-time fee.
9. Strategy change: admin updates `BotStrategyRegistry` on BOT Chain; operator mirrors it into the vault via `setStrategy`; unwinding/redeploying capital is a separate, deliberate operator action.

## Ordered tasks with required evidence

1. Scaffold Foundry repo, pin solc and OpenZeppelin, configure three RPC endpoints. Evidence: clean `forge build`.
2. Unit-test and implement `BotStrategyRegistry`. Evidence: owner/non-owner, versioning, invalid-config, and event tests pass.
3. Unit-test and implement `BotYieldPass`. Evidence: transfers revert, minter-only mint, ID semantics enforced.
4. Unit-test and implement `BotRewardClaims`. Evidence: exact fee math, duplicate claimId reverts, insufficient funding reverts, relayer-only, pause blocks claims.
5. Implement `EthYieldVault` as ERC-4626 with the integration sequence above. Evidence: interface compiles against verified mainnet ABIs, or TODO_BLOCKED.md entry naming the missing ABI.
6. Robinhood fork suite: chain ID 4663 assertion, zero-fee token property checks, swap-to-stable with slippage bound, unique BridgeRequest emission. Evidence: `forge test --fork-url $ROBINHOOD_RPC_URL` passes.
7. Ethereum fork suite: chain ID 1 assertion, resolve real pool/farm/PositionManager addresses, deposit USDC/USDT, mint shares, zap via keeper-built calldata, farm deposit, farm stake, harvest, redeem. Evidence: fork suite passes with real contracts.
8. BOT Chain fork suite: chain ID 677 assertion, USDT decimals read, registry strategy switch in one tx, pass minting, funded claim with fee split, duplicate-claim revert. Evidence: fork suite passes.
9. Invariants: claim IDs single-use, fee never exceeds cap, strategy version monotonic, passes non-transferable, no fee anywhere except claims. Evidence: invariant/fuzz runs pass.
10. Dry-run deployment manifests for all three chains with chain-ID assertions, no broadcast. Evidence: manifest JSONs generated.

## Completion criteria

- `forge build`, `forge fmt --check`, full test suite, and static analysis all pass.
- Every task above has evidence, or a dated entry in TODO_BLOCKED.md.
- No production transaction broadcast. No real keys used.
- artifacts/final-report.md lists scope, results per fork, exact pool/farm addresses used, and remaining manual steps (OpenLaunch launch, keeper deployment, ZaaS client ID request, farm/FairFlow verification on the live pool page).