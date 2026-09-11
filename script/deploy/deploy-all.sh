#!/bin/bash

# Deploy Little John Bot contracts to all chains
# Usage: ./deploy-all.sh

set -e

# Load environment variables
source .env

echo "==================================="
echo "🚀 Little John Bot Deployment"
echo "==================================="
echo ""

# ============================================
# 1. Deploy on Ethereum Mainnet
# ============================================
echo "1️⃣  Deploying on Ethereum Mainnet..."
echo ""

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY \
  --broadcast \
  --verify \
  -vvv

echo ""
echo "✅ Ethereum deployment complete!"
echo ""
read -p "Copy the EthYieldVault address above, then press Enter to continue..."

# ============================================
# 2. Deploy on BOT Chain
# ============================================
echo ""
echo "2️⃣  Deploying on BOT Chain..."
echo ""

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.botchain.ai \
  --broadcast \
  -vvv

echo ""
echo "✅ BOT Chain deployment complete!"
echo ""
read -p "Copy the BOT Chain addresses above, then press Enter to continue..."

# ============================================
# 3. Deploy on Robinhood Chain
# ============================================
echo ""
echo "3️⃣  Deploying on Robinhood Chain..."
echo ""

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.robinhood.chain \
  --broadcast \
  -vvv

echo ""
echo "✅ Robinhood Chain deployment complete!"
echo ""

# ============================================
# Summary
# ============================================
echo ""
echo "==================================="
echo "🎉 ALL DEPLOYMENTS COMPLETE!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Update BotStrategyRegistry with EthYieldVault address"
echo "2. Fund BotRewardClaims with USDT"
echo "3. Update frontend with contract addresses"
echo "4. Test with small deposit"
echo ""