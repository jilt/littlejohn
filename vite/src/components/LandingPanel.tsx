export default function LandingPanel() {
  return (
    <div className="landing-content">
      <div className="landing-stats">
        <div className="stat-card">
          <div className="stat-value">100%</div>
          <div className="stat-label">Stablecoins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">Zero</div>
          <div className="stat-label">Volatility</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">Iron-Clad</div>
          <div className="stat-label">Security</div>
        </div>
      </div>
    </div>
  )
}