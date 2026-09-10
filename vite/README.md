# Little John Bot Miniapp

Windows 98-styled Farcaster miniapp for interchain yield product.

## Setup

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Deploy

## Register as Farcaster Miniapp

1. Deploy to your domain (e.g., `little-john-bot.vercel.app`)
2. Update `public/.well-known/farcaster.json` with your domain
3. Go to `farcaster.xyz/~/developers/mini-apps/manifest`
4. Sign with your Farcaster custody address
5. Paste the header/payload/signature into the manifest file
6. Commit and redeploy

## Architecture

- Connects to Robinhood (4663), Ethereum (1), BOT Chain (677)
- Reads BotStrategyRegistry on BOT Chain
- Displays ERC-1155 passes
- Shows reward claims with fee breakdown
- Stub deposit/withdraw flows (to be connected to contracts)