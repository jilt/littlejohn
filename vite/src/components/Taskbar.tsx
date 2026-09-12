interface TaskbarProps {
  windows: Record<string, boolean>
  onToggle: (name: "landing" | "deposit" | "rewards") => void
}

export default function Taskbar({ windows, onToggle }: TaskbarProps) {
  return (
    <div className="taskbar">
      <button className="taskbar-start">
        <span>🪟</span> Start
      </button>
      
      {Object.entries(windows).map(([name, isOpen]) => (
  <button
    key={name}
    className={`taskbar-item ${isOpen ? 'active' : ''}`}
    onClick={() => onToggle(name as "landing" | "deposit" | "rewards")}
  >
    {name.charAt(0).toUpperCase() + name.slice(1)}
  </button>
))}
    </div>
  )
}