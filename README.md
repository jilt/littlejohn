# Little John Bot

https://ljb.ethical.haus/

This project is part of Ethical Haus a social finance experiment

## Flow diagram

![Phase 1](/flow-diagram/Windows-98-deposit-flow-diagram.png)
![Phase 2](/flow-diagram/Windows-98-bridge-flow-diagram.png)
![Phase 3](/flow-diagram/Windows-98-vault-flow-diagram.png)
![Phase 4](/flow-diagram/Windows-98-deploy-flow-diagram.png)
![Phase 5](/flow-diagram/Windows-98-rewards.png)
![Phase 6](/flow-diagram/Windows-98-claim-flow-diagram.png)
![Phase 7](/flow-diagram/Windows-98-withdraw-flow-diagram.png)

## Whitepaper

Botchain Interchain Orchestrator — Dynamic Stablecoin Vault
Version: 1.0
Date: September 2026
Ticker: LJB
Website: [https://ljb.ethical.haus]
Documentation: [https://github.com/littlejohn]

### Abstract
Little John Bot is a minimal, interchain yield product that routes capital from Robinhood Chain into a single, dynamic stablecoin strategy on Ethereum, while using BOT Chain as an orchestration and certification layer. Users stake an [OpenLaunch-issued token](https://openlaunch.lol); the protocol sells it into stables, deploys a mutable strategy that ensures the usage of stablecoins, starting at 300% APR. BOT Chain hosts two critical components: a strategy registry that lets the operator switch the target pool/farm with a single transaction, and an ERC-1155 "locking certification" system that issues passes to users. All protocol revenue comes from a 1% fee on reward claims, keeping the underlying robinhood token fee-free on launch platforms.

#### The Problem
DeFi users face a trade-off:

Simple products are easy to understand but rarely adapt to changing market conditions.

"Smart" yield optimizers are complex, opaque, and often overengineered.

Little John Bot aims for a middle ground:

One active strategy at a time, clearly described.

The ability to dynamically change that strategy when better opportunities appear.

Transparent, minimal smart-contract surface area.

A social, Farcaster-native interface where users see what they own, what they earn, and how the strategy can change.

#### The Solution
Little John Bot is a focused, interchain yield primitive:

Capital lives on Ethereum in a single, dynamic stablecoin strategy.

BOT Chain acts as the interchain orchestrator and certification layer.

Users interact via a Farcaster miniapp that is simple enough to understand in minutes.

The protocol earns only when users earn, via a fee on reward claims.

### Architecture Overview

#### Chains Involved
Chain	Chain ID	Role
Robinhood Chain	4663	Token entry + bridge request emission
Ethereum	1	ERC-4626 vault, Uniswap v4 LP, KyberSwap farm
BOT Chain	677	Strategy registry, ERC-1155 passes, reward claims
#### Capital Flow
```
User (Robinhood Chain)
  │
  ├─► Deposit LJB token
  │   └─► Swap LJB → USDC/USDT
  │
  ├─► Bridge to Ethereum
  │
  ▼
EthYieldVault (Ethereum)
  │
  ├─► Mint ERC-4626 shares to user
  │
  ├─► Zap into Uniswap v4 pool
  │   └─► Mint LP position NFT
  │
  ├─► Stake NFT in KyberSwap farm
  │
  └─► Harvest rewards periodically
      │
      ├─► Compound rewards (auto-reinvest)
      │
      └─► Bridge rewards to BOT Chain
          │
          ▼
BotRewardClaims (BOT Chain)
  │
  ├─► User claims rewards
  │   └─► Fee to treasury (1-10%)
  │   └─► Net rewards to user
  │
  └─► User can withdraw shares anytime
      │
      └─► Redeem shares → underlying assets
```
### Key Design Decisions
One strategy at a time — The vault points to a single Uniswap v4 pool and KyberSwap farm. The operator can change this pointer, but only one strategy is active at any moment.

No automatic migration — Changing the strategy pointer does not automatically move capital. The operator must deliberately unwind the old position and deploy into the new one.

Fee only on claims — The protocol charges no fees on deposits, withdrawals, or token transfers. Revenue comes solely from a percentage of claimed rewards (configurable 1-10%).

[BOT Chain](https://botchian.ai) as control plane — BOT Chain does not hold capital. It stores the strategy configuration and issues non-transferable passes that represent user status and lock commitments.

Farcaster-native UX — The entire interface is embedded in Farcaster casts, making it social, shareable, and accessible without leaving the feed.

### Token Model
#### OpenLaunch Token (LJB)
Standard: ERC-20 with EIP-2612 permit

Supply: Fixed 1,000,000,000 LJB

Chain: Robinhood Chain (4663)

Fees: 0% transfer/trading fees (displays as "0% fees" on OpenLaunch)

Properties: No mint, pause, blacklist, transfer tax, or owner, liquidity is locked on Robinhood

#### Vault Shares
Standard: ERC-4626 tokenized vault

Underlying Asset: USDC or USDT on Ethereum

Chain: Ethereum (1)

Function: Represents pro-rata claim on vault assets

Transferable: Yes (can be sold/traded independently)

#### Reward Token
Asset: USDT on BOT Chain (6 decimals)

Chain: BOT Chain (677)

Use: Distributed to users as claimed rewards

Fee: Protocol takes 1% of each claim (mutable)

#### Protocol Revenue
Source: Fee on reward claims only

Range: 1-10% (hard cap at 10%)

Recipient: Treasury address (mutable)

Rationale: Aligns protocol incentives with user success — no revenue unless users earn

### Smart Contracts
#### EthYieldVault (Ethereum)
Address: TBD
Chain: Ethereum Mainnet (1)
Standard: ERC-4626

Key Functions:

deposit(assets, receiver) — Deposit stablecoins, mint shares

redeem(shares, receiver, owner) — Burn shares, withdraw assets

setStrategy(pool, farm, slippage, description) — Admin-only strategy update

operatorZapIn(router, calldata, deadline) — Execute zap calldata (operator-only)

stakeIntoFarm(tokenId) — Deposit and stake LP position NFT

harvest(tokenId) — Claim farm rewards

totalAssets() — View total vault value (idle + deployed)

Security:

ReentrancyGuard

Pausable

Ownable (admin)

Operator role (separate from admin)

Whitelisted routers only

#### BotStrategyRegistry (BOT Chain)
Address: TBD
Chain: BOT Chain (677)
Purpose: Store current strategy configuration

Key Functions:

setStrategy(ethChainId, ethVault, pool, farm, slippage, description) — Update strategy

getStrategy() — View current config

strategy — Public struct with all config fields

Properties:

Holds no funds

Owner-only updates

Monotonic versioning (increments on every change)

Emits StrategyUpdated event on every change

#### BotYieldPass (BOT Chain)
Address: TBD
Chain: BOT Chain (677)
Standard: ERC-1155 (non-transferable)

Token IDs:

1 — Depositor Pass (minted on first deposit)

2 — Locked 30d Pass (minted after 30-day hold)

3 — Locked 90d Pass (minted after 90-day hold)

Key Functions:

mint(to, id, amount, data) — Minter-only (AccessControl)

burn(from, id, amount) — Admin-only (if needed)

Transfers revert (non-transferable by design)

Use Cases:

Display in Farcaster miniapp as achievements

Eligibility for reward campaigns

Reputation/gamification layer

#### BotRewardClaims (BOT Chain)
Address: TBD
Chain: BOT Chain (677)
Purpose: Distribute rewards with protocol fee

Key Functions:

depositRewards() — Fund reward pool (payable)

claimRewards(user, grossAmount, claimId) — Claim with fee (relayer-only)

setFeeBps(feeBps) — Update fee (owner-only, max 10%)

setTreasury(treasury) — Update fee recipient (owner-only)

pause() / unpause() — Emergency controls

Fee Mechanics:

text
feeAmount = grossAmount * feeBps / 10000
netAmount = grossAmount - feeAmount
transfer(feeAmount, treasury)
transfer(netAmount, user)
Security:

ReentrancyGuard

Pausable

Unique claim IDs (no double-claiming)

Relayer-only claims (prevents user front-running)

#### RobinhoodDepositAdapter (Robinhood Chain)
Address: TBD
Chain: Robinhood Chain (4663)
Purpose: Accept LJB deposits, swap to stable, emit bridge request

Key Functions:

depositAndBridge(amount, recipient) — User entry point

_swapToStable(amount) — Internal swap via router

setRouter(router) — Update router (owner-only)

setStableToken(stable) — Update stablecoin (owner-only)

setMaxSlippage(maxSlippageBps) — Update slippage tolerance (owner-only)

Events:

BridgeRequestEmitted(requestId, amount, recipient, nonce, timestamp) — For keeper to detect

TokenSwapped(amount, amountOut) — For tracking

### Strategy Orchestration
#### Strategy Pointer
The strategy is stored as a struct in BotStrategyRegistry:

```
struct StrategyConfig {
    uint256 ethChainId;      // Always 1 (Ethereum)
    address ethVault;        // EthYieldVault address
    address pool;            // Uniswap v4 pool address
    address farm;            // KyberSwap farm address
    uint256 slippage;        // Max slippage in bps (e.g., 500 = 5%)
    uint256 version;         // Monotonic counter
    string description;      // Human-readable description
}
```
#### Strategy Update Flow
Admin identifies better pool/farm opportunity

Admin calls BotStrategyRegistry.setStrategy(newConfig) on BOT Chain

Keeper detects StrategyUpdated event

Keeper mirrors config to EthYieldVault.setStrategy() on Ethereum

Keeper unwinds old position (if any):

Unstake from old farm

Remove liquidity from old pool

Swap to USDC

Keeper deploys to new pool:

Call ZaaS API for new pool calldata

Execute operatorZapIn() on vault

Stake new position in new farm

Key Point: Strategy changes are deliberate operator actions, not automatic. This prevents unintended migrations and gives the operator full control over timing.

#### Why Not Automatic Migration?
Gas efficiency: Unwinding and redeploying on every strategy change would be prohibitively expensive.

Risk management: Operator can wait for optimal conditions (low gas, high liquidity) before migrating.

Simplicity: No complex on-chain migration logic to audit or exploit.

### Risk Factors
#### Smart Contract Risk
Bugs in vault, registry, or reward contracts could lead to loss of funds.

Mitigation: Audits, formal verification (future), bug bounties.

#### Bridge Risk
Funds move between Robinhood, Ethereum, and BOT Chain via bridges.

Bridge exploits or delays could result in loss or locked funds.

Mitigation: Use reputable bridges (Across, LI.FI), diversify bridge providers.

#### Market Risk
Stablecoin depegs (USDC/USDT losing $1 peg).

Impermanent loss in Uniswap v4 position.

Mitigation: Diversify stablecoins, conservative tick ranges.

#### Strategy Risk
Operator may change strategy to underperforming pool/farm.

Past performance is not indicative of future results.

Mitigation: Transparent strategy history, clear communication.

#### Centralization Risk
Strategy changes and reward claims are controlled by designated admin/operator.

Mitigation: Multi-sig for admin keys, timelock for critical changes (future).

#### Regulatory Risk
Yield products may attract regulatory scrutiny.

Mitigation: Clear disclaimers, no promises of returns, compliance review.

### Team & Contributors
Developer: [jilt]

Advisors: [Sajan]

Auditors: [TBD]

Community: Farcaster, BOT Chain ecosystem

### Disclaimers
This is not financial advice. Little John Bot is an experimental DeFi protocol. Users should:

Understand the risks before depositing funds.

Only invest what they can afford to lose.

Do their own research (DYOR).

No promises of returns. Past performance is not indicative of future results. Yield is variable and depends on market conditions, pool performance, and farm rewards.

Smart contracts are experimental. While best practices are followed, bugs or exploits could result in total loss of funds.

### Contact & Resources
GitHub: [https://github.com/jilt]

Farcaster: [https://farcaster.com/jeeltcraft]

Documentation: [https://github.com/littlejohn]

Discord/Telegram: [littlejohn]

BOT Chain Ecosystem: https://www.botchain.ai/
