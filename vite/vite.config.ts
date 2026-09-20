import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vault-abi': path.resolve(__dirname, '../out/EthYieldVault.sol/EthYieldVault.json'),
    },
  },
  server: {
    port: 3000,
    fs: {
      allow: ['..'],
    },
  },
})