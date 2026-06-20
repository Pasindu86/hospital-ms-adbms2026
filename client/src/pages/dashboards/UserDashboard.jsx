import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import '../../styles/theme.css'
import './UserDashboard.css'

export default function UserDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <div className="patient-layout">
      <aside className="patient-sidebar">
        <h2>CarePulse</h2>
        <NavLink to="/user/home" end>Dashboard</NavLink>
        <NavLink to="/user/book">Book Appointment</NavLink>
        <NavLink to="/user/appointments">My Appointments</NavLink>
        <button className="patient-sidebar-logout" onClick={handleLogout}>Logout</button>
      </aside>

      <div className="patient-content">
        <header className="patient-topbar">
          <h3>Patient Portal</h3>
          <div className="topbar-user">Hi, <strong>{user?.name}</strong></div>
        </header>
        <main className="patient-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
