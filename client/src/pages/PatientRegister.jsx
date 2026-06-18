import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import './Login.css'
import { API_URL } from '../api'

export default function PatientRegister() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    phoneNumber: '', address: '', dob: '', gender: 'Male',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_URL}/patient/register`, {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        address: form.address,
        dob: form.dob,
        gender: form.gender,
      })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/user/home')
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Start backend first: cd server && npm start')
      } else {
        setError(err.response?.data?.error || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-box" style={{ maxWidth: 480 }}>
        <h1 className="hms-title">Create Account</h1>
        <p className="hms-subtitle">Register as a patient at CarePulse</p>

        <form onSubmit={handleSubmit} className="hms-form">
          {error && <div className="error-message">{error}</div>}

          <div className="input-group">
            <label>Full Name *</label>
            <div className="input-field-wrapper">
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
          </div>

          <div className="input-group">
            <label>Email *</label>
            <div className="input-field-wrapper">
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
          </div>

          <div className="input-group">
            <label>Password *</label>
            <div className="input-field-wrapper">
              <input name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>
          </div>

          <div className="input-group">
            <label>Confirm Password *</label>
            <div className="input-field-wrapper">
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          <div className="input-group">
            <label>Phone Number</label>
            <div className="input-field-wrapper">
              <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
            </div>
          </div>

          <div className="input-group">
            <label>Address</label>
            <div className="input-field-wrapper">
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label>Date of Birth</label>
              <div className="input-field-wrapper">
                <input name="dob" type="date" value={form.dob} onChange={handleChange} />
              </div>
            </div>
            <div className="input-group">
              <label>Gender</label>
              <div className="input-field-wrapper">
                <select name="gender" value={form.gender} onChange={handleChange} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" className="signin-submit-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ fontSize: 14, color: '#4a5568', textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: '#0066fe' }}>Login</Link>
        </p>
      </div>
    </div>
  )
}
