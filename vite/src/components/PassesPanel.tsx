import { useAccount } from 'wagmi'
import { botchain } from '../chains'
import { useReadContract } from 'wagmi'
import { CONTRACTS } from '../config/contracts'

export default function PassesPanel() {
  const { address } = useAccount()
  const { data: balanceDepositor, isLoading: isLoadingDepositor } = useReadContract({
    address: CONTRACTS.botChain.botYieldPass,
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
    args: [address || '0x00000000000000000000000000000000000000', 1n],
    chainId: botchain.id,
    query: { enabled: !!address }
  })

  const { data: balanceLocked30d, isLoading: isLoadingLocked30d } = useReadContract({
    address: CONTRACTS.botChain.botYieldPass,
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
    args: [address || '0x00000000000000000000000000000000000000', 2n],
    chainId: botchain.id,
    query: { enabled: !!address }
  })

  const { data: balanceLocked90d, isLoading: isLoadingLocked90d } = useReadContract({
    address: CONTRACTS.botChain.botYieldPass,
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
    args: [address || '0x00000000000000000000000000000000000000', 3n],
    chainId: botchain.id,
    query: { enabled: !!address }
  })

  if (!address) {
    return <div className="panel">Connect your wallet to view passes</div>
  }

  const isLoading = isLoadingDepositor || isLoadingLocked30d || isLoadingLocked90d

  if (isLoading) {
    return <div className="panel">Loading passes...</div>
  }

  return (
    <div>
      <h3>Your Locking Certifications</h3>
      <p>ERC-1155 passes secured on BOT Chain</p>
      
      <div className="passes-grid">
        <div className="pass-item">
          <div className="pass-icon">🎫</div>
          <div style={{ fontWeight: 'bold' }}>Depositor</div>
          <div style={{ fontSize: '20px', color: '#C6FE00', fontWeight: 'bold' }}>{balanceDepositor?.toString() || '0'}</div>
        </div>
        
        <div className="pass-item">
          <div className="pass-icon">🔒</div>
          <div style={{ fontWeight: 'bold' }}>Locked 30d</div>
          <div style={{ fontSize: '20px', color: '#C6FE00', fontWeight: 'bold' }}>{balanceLocked30d?.toString() || '0'}</div>
        </div>
        
        <div className="pass-item">
          <div className="pass-icon">🔐</div>
          <div style={{ fontWeight: 'bold' }}>Locked 90d</div>
          <div style={{ fontSize: '20px', color: '#C6FE00', fontWeight: 'bold' }}>{balanceLocked90d?.toString() || '0'}</div>
        </div>
      </div>
      
      <div className="status-bar">
        Passes are minted on BOT Chain when you deposit or reach milestones
      </div>
    </div>
  )
}