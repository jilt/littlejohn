import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { injected } from '@wagmi/connectors'
import { sdk } from '@farcaster/miniapp-sdk'

export const farcasterConnector = farcasterMiniApp()
export const injectedConnector = injected()

export async function initSDK() {
  await sdk.actions.ready()
}