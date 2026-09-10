interface TaskbarProps {
  windows: Record<string, boolean>
  onToggle: (name: "connect" | "strategy" | "deposit" | "passes" | "rewards") => void
}

export default function Taskbar({ windows, onToggle }: TaskbarProps) {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="taskbar">
      <button className="taskbar-start">
        <span>🪟</span> Start
      </button>
      
      {Object.entries(windows).map(([name, isOpen]) => (
  <button
    key={name}
    className={`taskbar-item ${isOpen ? 'active' : ''}`}
    onClick={() => onToggle(name as "connect" | "strategy" | "deposit" | "passes" | "rewards")}
  >
    {name.charAt(0).toUpperCase() + name.slice(1)}
  </button>
))}
      
      <div className="taskbar-tray">
        {time}
      </div>
    </div>
  )
}