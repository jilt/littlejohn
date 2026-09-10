export default function PassesPanel() {
  const passes = [
    { id: 1, name: 'Depositor', icon: '🎫' },
    { id: 2, name: 'Locked 30d', icon: '🔒' },
    { id: 3, name: 'Locked 90d', icon: '🔐' }
  ]

  return (
    <div>
      <p>Your locking certifications (ERC-1155)</p>
      
      <div className="passes-grid">
        {passes.map(pass => (
          <div key={pass.id} className="pass-item">
            <div className="pass-icon">{pass.icon}</div>
            <div style={{ fontSize: '12px' }}>{pass.name}</div>
            <div style={{ fontSize: '11px', color: '#808080' }}>ID: {pass.id}</div>
          </div>
        ))}
      </div>
      
      <div className="status-bar">
        Passes are minted on BOT Chain when you deposit or reach milestones
      </div>
    </div>
  )
}