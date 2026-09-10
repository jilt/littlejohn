import { useBotStrategy } from '../hooks/useBotStrategy'

export default function StrategyPanel() {
  const { strategy, isLoading, error } = useBotStrategy()

  if (isLoading) {
    return <div>Loading strategy...</div>
  }

  if (error) {
    return <div>Error loading strategy</div>
  }

  if (!strategy) {
    return <div>No strategy configured</div>
  }

  return (
    <div>
      <div className="panel">
        <strong>Strategy #{(strategy as any).version?.toString()}</strong>
      </div>
      
      <div className="panel">
        <strong>Pool:</strong><br />
        {(strategy as any).pool?.slice(0, 10)}...{(strategy as any).pool?.slice(-8)}
      </div>
      
      <div className="panel">
        <strong>Farm:</strong><br />
        {(strategy as any).farm?.slice(0, 10)}...{(strategy as any).farm?.slice(-8)}
      </div>
      
      <div className="panel">
        <strong>Max Slippage:</strong> {(strategy as any).slippage?.toString()} bps
      </div>
      
      <div className="panel">
        <strong>Description:</strong><br />
        {(strategy as any).description}
      </div>
      
      <div className="status-bar">
        Strategy is updatable by admin via BOT Chain
      </div>
    </div>
  )
}