import { ReactNode } from 'react'

interface Window98Props {
  title: string
  children: ReactNode
  onClose: () => void
}

export default function Window98({ title, children, onClose }: Window98Props) {
  return (
    <div className="window">
      <div className="window-header">
        <span>{title}</span>
        <button className="window-close" onClick={onClose}>X</button>
      </div>
      <div className="window-content">
        {children}
      </div>
    </div>
  )
}