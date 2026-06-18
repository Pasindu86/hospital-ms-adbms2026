import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './LandingPage.css'
import { API_URL } from '../api'

export default function LandingPage() {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [info, setInfo] = useState(null)
  const [showAllDoctors, setShowAllDoctors] = useState(false)

  useEffect(() => {
    axios.get(`${API_URL}/patient/public/doctors`).then((r) => setDoctors(r.data)).catch(() => {})
    axios.get(`${API_URL}/patient/public/info`).then((r) => setInfo(r.data)).catch(() => {})
  }, [])

  const visibleDoctors = showAllDoctors ? doctors : doctors.slice(0, 4)

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="nav-brand">
          <span className="brand-icon">+</span>
          CarePulse Hospital
        </div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#doctors">Doctors</a>
          <a href="#info">Info</a>
          <button className="nav-btn-outline" onClick={() => navigate('/login')}>Login</button>
          <button className="nav-btn-primary" onClick={() => navigate('/patient/register')}>Register</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>{info?.hospitalName || 'CarePulse Hospital'}</h1>
          <p>{info?.tagline || 'Compassionate Care, Advanced Medicine'}</p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => navigate('/patient/register')}>
              Book an Appointment
            </button>
            <button className="btn-hero-secondary" onClick={() => navigate('/login')}>
              Login
            </button>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <h2>About Our Hospital</h2>
        <p className="section-text">{info?.about}</p>
        <div className="services-grid">
          {(info?.services || []).map((s) => (
            <div key={s} className="service-chip">{s}</div>
          ))}
        </div>
      </section>

      <section id="doctors" className="section section-alt">
        <h2>Our Doctors</h2>
        <p className="section-sub">Meet our experienced medical professionals</p>
        <div className="doctors-grid">
          {visibleDoctors.map((doc) => (
            <div key={doc.doctorId} className="doctor-card">
              <div className="doctor-avatar">{doc.name?.charAt(0)}</div>
              <h3>{doc.name}</h3>
              <p className="doctor-specialty">{doc.specialty || 'General Medicine'}</p>
              <p className="doctor-email">{doc.email}</p>
            </div>
          ))}
        </div>
        {doctors.length > 4 && (
          <div className="section-center">
            <button className="btn-show-more" onClick={() => setShowAllDoctors(!showAllDoctors)}>
              {showAllDoctors ? 'Show Less' : `View All ${doctors.length} Doctors`}
            </button>
          </div>
        )}
      </section>

      <section id="info" className="section">
        <h2>General Information</h2>
        <div className="info-grid">
          <div className="info-card">
            <h4>Address</h4>
            <p>{info?.address}</p>
          </div>
          <div className="info-card">
            <h4>Contact</h4>
            <p>{info?.phone}</p>
            <p>{info?.email}</p>
          </div>
          <div className="info-card">
            <h4>Hours</h4>
            <p>{info?.hours}</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 CarePulse Hospital Management System. All rights reserved.</p>
        <Link to="/login">Portal Login</Link>
      </footer>
    </div>
  )
}
