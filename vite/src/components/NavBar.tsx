export default function NavBar() {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="navbar">
      <div className="navbar-title">
        <img src="/icon.png" alt="LJB" width="24" height="24" />
        Little John Bot
      </div>
      <div className="navbar-time">
        {time}
      </div>
    </div>
  )
}