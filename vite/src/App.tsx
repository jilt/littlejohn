import { useState, useEffect } from 'react'
import { initSDK } from './connector'
import NavBar from './components/NavBar'
import Taskbar from './components/Taskbar'
import LandingPanel from './components/LandingPanel'
import RewardsPanel from './components/RewardsPanel'
import DepositPanel from './components/DepositPanel'
import Window98 from './components/Window98'

function App() {
  const [windows, setWindows] = useState({
    landing: true,
    rewards: true,
    deposit: true
  })

  useEffect(() => {
    initSDK().catch(console.error)
  }, [])

  const toggleWindow = (name: keyof typeof windows) => {
    setWindows(prev => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <div className="desktop">
      <NavBar />
      
      <div className="desktop-icons">
        {windows.landing && (
          <Window98 title="Little John Bot" onClose={() => toggleWindow('landing')}>
            <LandingPanel />
          </Window98>
        )}
        
                {windows.rewards && (
          <Window98 title="Rewards" onClose={() => toggleWindow('rewards')}>
            <RewardsPanel />
          </Window98>
        )}
        
        {windows.deposit && (
          <Window98 title="Deposit / Withdraw" onClose={() => toggleWindow('deposit')}>
            <DepositPanel />
          </Window98>
        )}
      </div>
      
      <Taskbar windows={windows} onToggle={toggleWindow} />
    </div>
  )
}

export default App