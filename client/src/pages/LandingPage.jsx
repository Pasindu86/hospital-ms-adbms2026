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
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [selectedDate, setSelectedDate] = useState('')
  const [availableTokens, setAvailableTokens] = useState(null)
  const [loadingTokens, setLoadingTokens] = useState(false)

  useEffect(() => {
    axios.get(`${API_URL}/patient/public/doctors`).then((r) => setDoctors(r.data)).catch(() => { })
    axios.get(`${API_URL}/patient/public/info`).then((r) => setInfo(r.data)).catch(() => { })
  }, [])

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setLoadingTokens(true)
      axios.get(`${API_URL}/patient/public/doctors/${selectedDoctor.doctorId}/slots?date=${selectedDate}`)
        .then(r => {
          setAvailableTokens(r.data.nextToken)
        })
        .catch(() => setAvailableTokens(null))
        .finally(() => setLoadingTokens(false))
    } else {
      setAvailableTokens(null)
    }
  }, [selectedDoctor, selectedDate])

  const handleDoctorClick = (doc) => {
    setSelectedDoctor(doc)
    setSelectedWeek(0)
    setSelectedDate('')
    setAvailableTokens(null)
  }

  const generateAvailableDates = (availability, weekOffset) => {
    if (!availability || availability.length === 0) return []
    const availableDays = new Set(availability.map(a => a.dayOfWeek))

    const today = new Date()
    const currentDay = today.getDay() || 7 // 1-7 (Mon-Sun)

    const monday = new Date(today)
    monday.setDate(today.getDate() - currentDay + 1 + (weekOffset * 7))

    const dates = []
    const todayAtMidnight = new Date(today.setHours(0, 0, 0, 0))

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)

      if (weekOffset === 0 && d < todayAtMidnight) {
        continue
      }

      const isoDay = d.getDay() || 7
      if (availableDays.has(isoDay)) {
        dates.push({
          date: d.toISOString().slice(0, 10),
          display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        })
      }
    }
    return dates
  }

  const visibleDoctors = showAllDoctors ? doctors : doctors.slice(0, 4)

  const dayNames = {
    1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
  }

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
            <div key={doc.doctorId} className="doctor-card" onClick={() => handleDoctorClick(doc)}>
              <div className="doctor-avatar">{doc.name?.charAt(0)}</div>
              <h3>{doc.name}</h3>
              <p className="doctor-specialty">{doc.specialty || 'General Medicine'}</p>
              <button className="btn-show-details">Show All Details</button>
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

      {selectedDoctor && (
        <div className="doctor-modal-overlay" onClick={() => setSelectedDoctor(null)}>
          <div className="doctor-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="doctor-modal-close" onClick={() => setSelectedDoctor(null)}>&times;</button>
            <div className="doctor-modal-header">
              <div className="doctor-avatar modal-avatar">{selectedDoctor.name?.charAt(0)}</div>
              <h2>{selectedDoctor.name}</h2>
              <p className="doctor-specialty">{selectedDoctor.specialty || 'General Medicine'}</p>
            </div>
            <div className="doctor-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="detail-row">
                <strong>Email:</strong> <span>{selectedDoctor.email}</span>
              </div>
              <div className="detail-row">
                <strong>Phone:</strong> <span>{selectedDoctor.phone || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Total Fee:</strong> <span>Rs. {selectedDoctor.totalFee}</span>
              </div>
              <div className="availability-section">
                <strong>General Schedule:</strong>
                {selectedDoctor.availability && selectedDoctor.availability.length > 0 ? (
                  <ul className="availability-list" style={{ marginBottom: '16px' }}>
                    {selectedDoctor.availability.map((avail, idx) => (
                      <li key={idx}>
                        {dayNames[avail.dayOfWeek]}: {avail.startTime} - {avail.endTime}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No schedule found.</p>
                )}

                <div className="week-selector" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button
                    className={`btn-hero-${selectedWeek === 0 ? 'primary' : 'secondary'}`}
                    style={{ padding: '8px 12px', flex: 1, border: '1px solid #0066fe', color: selectedWeek === 0 ? 'white' : '#0066fe', background: selectedWeek === 0 ? '#0066fe' : 'transparent' }}
                    onClick={() => { setSelectedWeek(0); setSelectedDate(''); }}
                  >
                    This Week
                  </button>
                  <button
                    className={`btn-hero-${selectedWeek === 1 ? 'primary' : 'secondary'}`}
                    style={{ padding: '8px 12px', flex: 1, border: '1px solid #0066fe', color: selectedWeek === 1 ? 'white' : '#0066fe', background: selectedWeek === 1 ? '#0066fe' : 'transparent' }}
                    onClick={() => { setSelectedWeek(1); setSelectedDate(''); }}
                  >
                    Next Week
                  </button>
                </div>

                {selectedDoctor.availability && selectedDoctor.availability.length > 0 && (
                  <>
                    <p style={{ fontSize: '14px', marginBottom: '8px', color: '#4a5568' }}>Select a date to check the token number:</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {generateAvailableDates(selectedDoctor.availability, selectedWeek).map((d) => (
                        <button
                          key={d.date}
                          onClick={() => setSelectedDate(d.date)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: `1px solid ${selectedDate === d.date ? '#0066fe' : '#e2e8f0'}`,
                            background: selectedDate === d.date ? '#0066fe' : '#fff',
                            color: selectedDate === d.date ? '#fff' : '#4a5568',
                            cursor: 'pointer'
                          }}
                        >
                          {d.display}
                        </button>
                      ))}
                      {generateAvailableDates(selectedDoctor.availability, selectedWeek).length === 0 && (
                        <span style={{ fontSize: '13px', color: '#a0aec0' }}>No available dates in this week.</span>
                      )}
                    </div>
                  </>
                )}

                {selectedDate && (
                  <div style={{ padding: '12px', background: '#ebf4ff', borderRadius: '8px', border: '1px solid #bee3f8' }}>
                    {loadingTokens ? (
                      <span style={{ color: '#0066fe' }}>Checking token number...</span>
                    ) : (
                      <span style={{ color: '#2b6cb0', fontWeight: 'bold' }}>
                        {availableTokens ? `Next Token No: ${availableTokens}` : 'No Tokens Available (Fully Booked)'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="doctor-modal-actions">
              <button className="btn-hero-primary" onClick={() => navigate('/patient/register')}>Book Appointment</button>
            </div>
          </div>
        </div>
      )}

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