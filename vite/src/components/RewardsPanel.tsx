export default function RewardsPanel() {
  // These would be real values from BotRewardClaims contract
  const grossRewards = '0.00'
  const feeBps = 100
  const feeAmount = '0.00'
  const netRewards = '0.00'

  return (
    <div>
      <div className="panel">
        <strong>Gross Rewards:</strong><br />
        {grossRewards} USDT
      </div>
      
      <div className="panel">
        <strong>Protocol Fee:</strong><br />
        {feeBps / 100}% ({feeAmount} USDT)
      </div>
      
      <div className="panel">
        <strong>Net Claim:</strong><br />
        {netRewards} USDT
      </div>
      
      <button className="btn btn-primary" style={{ width: '100%' }}>
        Claim Rewards
      </button>
      
      <div className="status-bar">
        Rewards are claimed on BOT Chain with a 1% protocol fee
      </div>
    </div>
  )
}