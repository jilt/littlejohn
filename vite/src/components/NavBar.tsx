import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

export default function NavBar() {
  const { address, isConnected, chain } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="navbar">
      <div className="navbar-title">
        <img src="/icon.png" alt="LJB" width="24" height="24" />
        Little John Bot
      </div>
      <div className="navbar-right">
        {isConnected ? (
          <div className="nav-wallet-info">
            <span className="nav-address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <span className="nav-network">{chain?.name || 'Unknown'}</span>
            <button className="nav-btn" onClick={() => disconnect()}>Disconnect</button>
          </div>
        ) : (
          <button className="nav-btn" onClick={() => connect({ connector: farcasterMiniApp() })}>
            Connect Wallet
          </button>
        )}
        <div className="navbar-time">{time}</div>
      </div>
    </div>
  )
}