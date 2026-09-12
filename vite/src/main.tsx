import React from 'react'
import ReactDOM from 'react-dom/client'
import { createConfig, WagmiProvider } from 'wagmi'
import { http } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/windows98.css'
import { robinhood, ethereum, botchain } from './chains'
import { injectedConnector, farcasterConnector } from './connector'

const config = createConfig({
  chains: [robinhood, ethereum, botchain],
  transports: {
    [robinhood.id]: http(),
    [ethereum.id]: http(),
    [botchain.id]: http()
  },
  connectors: [injectedConnector, farcasterConnector]
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      gcTime: 30_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <App />
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>
)