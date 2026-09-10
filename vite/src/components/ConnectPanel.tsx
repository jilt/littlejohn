import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

export default function ConnectPanel() {
  const { address, isConnected, chain } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  if (!isConnected) {
    return (
      <div>
        <p>Connect your wallet to get started</p>
        <button className="btn btn-primary" onClick={() => connect({ connector: farcasterMiniApp() })}>
          Connect
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="panel">
        <strong>Address:</strong><br />
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
      
      <div className="panel">
        <strong>Network:</strong><br />
        {chain?.name || 'Unknown'}
      </div>
      
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => switchChain({ chainId: 4663 })}>
          Robinhood
        </button>
        <button className="btn" onClick={() => switchChain({ chainId: 1 })}>
          Ethereum
        </button>
        <button className="btn" onClick={() => switchChain({ chainId: 677 })}>
          BOT Chain
        </button>
      </div>
      
      <button className="btn" onClick={disconnect} style={{ marginTop: '12px' }}>
        Disconnect
      </button>
    </div>
  )
}