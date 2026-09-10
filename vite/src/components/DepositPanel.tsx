import { useState } from 'react'

export default function DepositPanel() {
  const [amount, setAmount] = useState('')
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <button 
          className={`btn ${tab === 'deposit' ? 'btn-primary' : ''}`}
          onClick={() => setTab('deposit')}
        >
          Deposit
        </button>
        <button 
          className={`btn ${tab === 'withdraw' ? 'btn-primary' : ''}`}
          onClick={() => setTab('withdraw')}
        >
          Withdraw
        </button>
      </div>

      {tab === 'deposit' ? (
        <div>
          <p>Deposit LJB tokens (Robinhood Chain)</p>
          <p style={{ fontSize: '12px', color: '#808080' }}>
            LJB → stables → Ethereum vault → LP + farm
          </p>
          
          <input
            type="text"
            className="input"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          
          <button className="btn btn-primary" style={{ width: '100%' }}>
            Deposit
          </button>
        </div>
      ) : (
        <div>
          <p>Withdraw your share of the vault</p>
          <div className="panel">
            <strong>Your Shares:</strong><br />
            0.00 LJB
          </div>
          
          <input
            type="text"
            className="input"
            placeholder="Shares to withdraw"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          
          <button className="btn btn-primary" style={{ width: '100%' }}>
            Withdraw
          </button>
        </div>
      )}
      
      <div className="status-bar">
        0% token fees • Fee only on reward claims
      </div>
    </div>
  )
}