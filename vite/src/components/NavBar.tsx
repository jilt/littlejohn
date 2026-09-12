import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { injectedConnector, farcasterConnector, initSDK } from '../connector'
import { CONTRACTS } from '../config/contracts'
import { botchain } from '../chains'

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { address, isConnected, chain } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const zeroAddr = '0x000000000000000000000000000000000000' as `0x${string}`
  const readAddress = (address || zeroAddr) as `0x${string}`

  const { data: balanceDepositor } = useReadContract({
    address: CONTRACTS.botChain.botYieldPass as `0x${string}`,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'account', type: 'address' },
        { name: 'id', type: 'uint256' }
      ],
      outputs: [{ name: 'balance', type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: [readAddress, 1n],
    chainId: botchain.id,
    query: { enabled: !!address }
  })

  const { data: balanceLocked30d } = useReadContract({
    address: CONTRACTS.botChain.botYieldPass as `0x${string}`,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'account', type: 'address' },
        { name: 'id', type: 'uint256' }
      ],
      outputs: [{ name: 'balance', type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: [readAddress, 2n],
    chainId: botchain.id,
    query: { enabled: !!address }
  })

  const { data: balanceLocked90d } = useReadContract({
    address: CONTRACTS.botChain.botYieldPass as `0x${string}`,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'account', type: 'address' },
        { name: 'id', type: 'uint256' }
      ],
      outputs: [{ name: 'balance', type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: [readAddress, 3n],
    chainId: botchain.id,
    query: { enabled: !!address }
  })

  const passLabels = [
    { name: 'Depositor', count: Number(balanceDepositor || 0n) },
    { name: '30d Lock', count: Number(balanceLocked30d || 0n) },
    { name: '90d Lock', count: Number(balanceLocked90d || 0n) },
  ].filter(p => p.count > 0)

  const showPasses = isConnected && passLabels.length > 0

  const handleConnectInjected = async () => {
    connect({ connector: injectedConnector })
    setMenuOpen(false)
  }

  const handleConnectFarcaster = async () => {
    await initSDK()
    connect({ connector: farcasterConnector })
    setMenuOpen(false)
  }

  const handleDisconnect = () => {
    disconnect()
    setMenuOpen(false)
  }

  return (
    <div className={`navbar${menuOpen ? ' menu-open' : ''}`}>
      <div className="navbar-title">
        <img src="/icon.png" alt="LJB" width="24" height="24" />
        Little John Bot
      </div>
      <div className="navbar-right">
        {isConnected ? (
          <div className="nav-wallet-info">
            <span className="nav-address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <span className="nav-network">{chain?.name || 'Unknown'}</span>
            {showPasses ? (
              passLabels.map(pass => (
                <span key={pass.name} className="nav-passes">{pass.name} {pass.count}</span>
              ))
            ) : isConnected ? (
              <span className="nav-passes">0 Passes</span>
            ) : null}
            <button className="nav-btn" onClick={handleDisconnect}>Disconnect</button>
          </div>
        ) : (
          <div className="nav-connect-group">
            <button className="nav-btn" onClick={handleConnectInjected}>
              Connect Wallet
            </button>
            <button className="nav-btn" onClick={handleConnectFarcaster}>
              Farcaster
            </button>
          </div>
        )}
        <button className="nav-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
        <div className="navbar-time">{time}</div>
      </div>
    </div>
  )
}