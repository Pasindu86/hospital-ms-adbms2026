import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import './Login.css'
import { API_URL } from '../api'

export default function PatientLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_URL}/patient/login`, { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/user/home')
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Start backend first: cd server && npm start')
      } else {
        setError(err.response?.data?.error || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="logo-container">
          <div className="pulse-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
        </div>
        <h1 className="hms-title">CarePulse</h1>
        <p className="hms-subtitle">Patient Portal Login</p>

        <form onSubmit={handleSubmit} className="hms-form">
          {error && <div className="error-message">{error}</div>}

          <div className="input-group">
            <label htmlFor="email">Email or Patient ID</label>
            <div className="input-field-wrapper">
              <input
                id="email"
                type="text"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-field-wrapper">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="signin-submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ fontSize: 14, color: '#4a5568', textAlign: 'center' }}>
          Don't have an account? <Link to="/patient/register" style={{ color: '#0066fe' }}>Register</Link>
        </p>
        <p style={{ fontSize: 13, textAlign: 'center', marginTop: 8 }}>
          <Link to="/" style={{ color: '#a0aec0' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  )
}
