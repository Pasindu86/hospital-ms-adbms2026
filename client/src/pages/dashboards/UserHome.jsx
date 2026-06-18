import { useNavigate } from 'react-router-dom'
import './UserDashboard.css'

export default function UserHome() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <div>
      <div className="welcome-banner">
        <h2>Hi, {user?.name} 👋</h2>
        <p>Welcome to your patient dashboard. Manage your appointments below.</p>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Book Appointment</h3>
          <p>Schedule a visit with one of our doctors</p>
          <button className="btn-primary" onClick={() => navigate('/user/book')}>
            Book Now
          </button>
        </div>

        <div className="card">
          <h3>My Appointments</h3>
          <p>View, edit, or cancel your scheduled visits</p>
          <button className="btn-secondary" onClick={() => navigate('/user/appointments')}>
            View All
          </button>
        </div>

        <div className="card">
          <h3>Health Records</h3>
          <p>View your medical history — coming soon</p>
          <button className="btn-secondary" disabled>Coming Soon</button>
        </div>
      </div>
    </div>
  )
}
