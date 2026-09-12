goal: |
  Integrate the already-deployed Little John Bot contracts into the UI end‑to‑end, focusing on:
  - PassesPanel (ERC1155 BotYieldPass on BOT Chain)
  - RewardsPanel (BotRewardClaims on BOT Chain)
  - StrategyPanel (BotStrategyRegistry on BOT Chain, read‑only)
  - DepositPanel (EthYieldVault on Ethereum + LJB on Robinhood)
  - Basic wallet + chain switching (Farcaster MiniApp + simple chain switch)

  Do NOT deploy any new contracts. Only interact with:
  - BotRewardClaims: 0xF8296c312e5E349184988Dd8C8e87Dc05e65FCa8 (BOT, 677)
  - BotStrategyRegistry: 0xc30058704D917e050d84999bd93a16a2e7C1B893 (BOT, 677)
  - BotYieldPass: 0x2dD67797F0c9Db63500992819827aBC2E3932A22 (BOT, 677, ERC1155)
  - LJB Token: 0xF0C81b03A33463272a5466AfAeD628989A030F82 (Robinhood, 4663, ERC20)
  - EthYieldVault: 0xc30058704D917e050d84999bd93a16a2e7C1B893 (Ethereum, 1)

  Use the existing ContractConfigs.ts and hooks (useBotStrategyRegistry, useBotYieldPass, useBotRewardClaims, useEthYieldVault, useLjbToken) as the single source of truth for ABIs and addresses.

context: |
  - Phase 1 (core contract infrastructure) is complete: ABIs, interfaces, and ContractConfigs.ts exist.
  - Hooks exist but may be incomplete or not wired to UI components yet.
  - UI panels (PassesPanel, RewardsPanel, StrategyPanel, DepositPanel, ConnectPanel) exist in src/components/ but may still use mock data.
  - README.md describes the intended multi‑chain behavior; treat it as authoritative for chain mapping and fee logic (1% feeBps = 100).
      The README.md in the repo root contains the whitepaper that defines:
      - Which contracts live on which chains (Robinhood=4663, Ethereum=1, BOT=677)
      - Expected user flows (deposit LJB → swap to stable → vault on ETH; claim passes; claim rewards)
      - Fee structure (1% feeBps = 100)
      - Non-transferable ERC1155 passes (empty transfers)
  - Tests should be lightweight smoke tests that call read functions and simulate writes; no heavy fork tests needed now.

steps:
  - id: 1
    title: Audit existing hooks and configs
    tasks:
      - Read src/config/ContractConfigs.ts and verify addresses match:
        - BotRewardClaims, BotStrategyRegistry, BotYieldPass on chainId 677
        - LJB token on chainId 4663
        - EthYieldVault on chainId 1
      - For each hook (useBotStrategyRegistry, useBotYieldPass, useBotRewardClaims, useEthYieldVault, useLjbToken):
        - Confirm it imports ABI and address from ContractConfigs.
        - Confirm it exposes at least:
          - read functions (balanceOf, totalRewards, strategy, etc.)
          - write functions (mint, claimRewards, deposit, withdraw, setStrategy if admin).
      - If any hook is missing critical functions, extend it but do not change ABIs or addresses.

  - id: 2
    title: Wire PassesPanel to BotYieldPass (ERC1155)
    tasks:
      - In src/components/PassesPanel.tsx:
        - Import useBotYieldPass().
        - Replace mock balances with real calls:
          - balanceOf(user, ID_DEPOSITOR)
          - balanceOf(user, ID_LOCKED_30D)
          - balanceOf(user, ID_LOCKED_90D)
        - Display three rows: “Depositor”, “Locked 30d”, “Locked 90d” with numeric balances.
      - If an admin flag exists:
        - Add a simple “Mint Pass” section that calls mint(to, id, amount) for a chosen ID.
        - Restrict this UI to admin addresses only (hard‑code or read from config).
      - Ensure errors (wrong chain, no wallet) show friendly messages.

  - id: 3
    title: Wire RewardsPanel to BotRewardClaims
    tasks:
      - In src/components/RewardsPanel.tsx:
        - Import useBotRewardClaims().
        - Read and display:
          - totalRewards()
          - feeBps() and compute fee percentage (feeBps / 100).
          - For a given user, show:
            - balances(user) as “Claimable balance”.
        - Implement a “Claim” button that:
          - Calls claimRewards(user, grossAmount, claimId).
          - Uses grossAmount = user’s balance (or a controlled input).
          - Shows netAmount = grossAmount - fee in a tooltip or label.
      - Add basic validation:
        - Disable claim if balance == 0 or wrong chain.
        - Show transaction status (pending, success, error).

  - id: 4
    title: Wire StrategyPanel to BotStrategyRegistry (read‑only)
    tasks:
      - In src/components/StrategyPanel.tsx:
        - Import useBotStrategyRegistry().
        - Read current strategy (ethVault, pool, farm, slippage, version).
        - Display these fields in a simple table or list.
      - If admin:
        - Add an “Update Strategy” form that calls setStrategy(...) with:
          - ethChainId, ethVault, pool, farm, slippage, description.
        - Validate slippage ≤ MAX_SLIPPAGE_BPS (500) before sending.
      - Ensure the panel gracefully handles “no strategy set yet”.

  - id: 5
    title: Wire DepositPanel to EthYieldVault + LJB
    tasks:
      - In src/components/DepositPanel.tsx:
        - Import useEthYieldVault() and useLjbToken().
        - Detect current chain:
          - If on Robinhood (4663):
            - Show LJB balance (balanceOf(user)).
            - Implement “Approve LJB” → approve(RobinhoodDepositAdapter or adapter address, amount).
            - Implement “Deposit” flow:
              - User enters LJB amount.
              - Call adapter.deposit(amount) or equivalent (based on actual Robinhood adapter ABI).
              - Explain that funds will be swapped to stable and bridged to Ethereum vault.
          - If on Ethereum (1):
            - Show EthYieldVault balanceOf(user) as “Vault shares”.
            - Implement “Deposit” (deposit(assets, receiver)) and “Withdraw” (withdraw/redeem) if appropriate.
      - Add chain warnings:
        - “Switch to Robinhood to deposit LJB.”
        - “Switch to Ethereum to manage vault shares.”

  - id: 6
    title: Basic wallet + chain switching
    tasks:
      - Ensure ConnectPanel:
        - Uses existing Farcaster MiniApp connector.
        - Shows current chainId and network name.
      - Add a simple chain switcher:
        - Dropdown or buttons for: BOT (677), Ethereum (1), Robinhood (4663).
        - On change, call wallet’s chain switch method (e.g., wallet_switchEthereumChain).
        - Handle unsupported chains gracefully.
      - Confirm that switching chains updates:
        - Contract hooks (they should auto‑pick the right address/ABI by chainId).
        - Panel data (balances, strategies, etc.).

  - id: 7
    title: Lightweight smoke tests & documentation
    tasks:
      - Create PASSEDTEST_UI.md with:
        - Manual test checklist:
          - Connect wallet, switch chains, verify each panel loads real data.
          - Mint a pass (admin), claim rewards, read strategy, deposit LJB.
        - List of contract addresses (as in your plan).
      - Create FAILEDTEST_UI.md as a template for future failures (leave items unchecked).
      - Add a short “How to run UI tests” section in README.md:
        - Start dev server.
        - Connect wallet.
        - Go through panels in order.

constraints: |
  - Do NOT deploy or modify any contracts.
  - Do NOT change ABIs or addresses in ContractConfigs.ts unless you find a clear mismatch with the known addresses; if you change anything, log it explicitly in PASSEDTEST_UI.md.
  - Keep changes localized to:
    - src/components/*Panel.tsx
    - src/hooks/use*.ts (only to expose missing functions, not to redesign)
    - src/config/ContractConfigs.ts (only if an address is wrong)
    - README.md, PASSEDTEST_UI.md, FAILEDTEST_UI.md
  - Prefer small, incremental commits per panel (e.g., “Wire PassesPanel to BotYieldPass”).

acceptance_criteria: |
  - All four panels (Passes, Rewards, Strategy, Deposit) display real on‑chain data when connected to the correct chain.
  - Admin functions (mint pass, update strategy, claim rewards) are callable from the UI where appropriate.
  - Chain switching updates displayed data without errors.
  - PASSEDTEST_UI.md documents:
    - Steps taken.
    - Contract addresses used.
    - Manual test results (what was actually tested in this session).
  - No new contract deployments occur; only existing deployed contracts are used.

output_files:
  - src/components/PassesPanel.tsx
  - src/components/RewardsPanel.tsx
  - src/components/StrategyPanel.tsx
  - src/components/DepositPanel.tsx
  - src/components/ConnectPanel.tsx (if chain switcher is added here)
  - PASSEDTEST_UI.md
  - FAILEDTEST_UI.md