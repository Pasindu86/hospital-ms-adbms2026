import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ReceptionDashboard.css'

const API_URL = 'http://localhost:5000/api'

// Mock initial data to populate the dashboard if database is empty initially
const mockPatients = [
  { patientId: 1, name: 'James Dorian', email: 'james.dorian@gmail.com', gender: 'Male', phoneNumber: '+94 77 123 4567', disease: 'General Checkup', dob: '1992-05-14', address: '74, Flower Road, Colombo 07' },
  { patientId: 2, name: 'Elena Larsson', email: 'elena.l@outlook.com', gender: 'Female', phoneNumber: '+94 71 987 6543', disease: 'Consultation', dob: '1988-11-20', address: '12/A, Galle Road, Mount Lavinia' },
  { patientId: 3, name: 'Marcus Reed', email: 'marcus.reed@yahoo.com', gender: 'Male', phoneNumber: '+94 75 444 8899', disease: 'Vaccination', dob: '2001-02-03', address: '45, Kandy Road, Kadawatha' }
]

export default function ReceptionDashboard() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Navigation & Dropdown States
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phoneNumber: '',
    disease: '',
    dob: '',
    gender: 'Male',
    doctorId: ''
  })

  // Safe user parsing from localStorage
  let user = { name: 'Sarah Miller', role: 'reception' }
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      user = JSON.parse(userStr)
    }
  } catch (e) {
    console.error('Failed to parse user from localStorage', e)
  }

  const userName = user.name || 'Staff'

  // Load patients from backend
  const fetchPatients = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data && res.data.length > 0) {
        setPatients(res.data)
      } else {
        setPatients(mockPatients)
      }
    } catch (err) {
      console.error('Failed to fetch patients, using mock data as fallback', err)
      setPatients(mockPatients)
    } finally {
      setLoading(false)
    }
  }

  // Load available doctors from backend
  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_URL}/patients/doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDoctors(res.data || [])
    } catch (err) {
      console.error('Failed to fetch doctors', err)
    }
  }

  useEffect(() => {
    fetchPatients()
    fetchDoctors()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API_URL}/patients`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMessage({ type: 'success', text: res.data.message || 'Patient registered successfully via PL/SQL stored procedure!' })
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        address: '',
        phoneNumber: '',
        disease: '',
        dob: '',
        gender: 'Male',
        doctorId: ''
      })

      // Reload patients list
      fetchPatients()
    } catch (err) {
      console.error(err)
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save patient record. Please check server logs.'
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Safe patients filtering by name, id or disease
  const filteredPatients = patients.filter(p => {
    const pName = p.name ? String(p.name).toLowerCase() : ''
    const pId = p.patientId ? String(p.patientId).toLowerCase() : ''
    const pDisease = p.disease ? String(p.disease).toLowerCase() : ''
    const term = searchTerm.toLowerCase()
    return pName.includes(term) || pId.includes(term) || pDisease.includes(term)
  })

  // Quick stats calculation
  const totalCount = patients.length
  const maleCount = patients.filter(p => p.gender && String(p.gender).toLowerCase() === 'male').length
  const femaleCount = patients.filter(p => p.gender && String(p.gender).toLowerCase() === 'female').length

  return (
    <div className="reception-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">⊕</div>
          <div className="sidebar-brand-text">
            <h2>CarePulse HMS</h2>
            <span>Central Ward</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">⊞</span>Dashboard
          </button>
          <button 
            className={`sidebar-nav-item ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <span className="nav-icon">👥</span>Patients
          </button>
          <button className="sidebar-nav-item" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <span className="nav-icon">📅</span>Appointments
          </button>
          <button className="sidebar-nav-item" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <span className="nav-icon">📦</span>Inventory
          </button>
          <button className="sidebar-nav-item" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <span className="nav-icon">⚙</span>Settings
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-bottom-item">
            <span className="nav-icon">❓</span>Help Center
          </button>
          <button className="sidebar-bottom-item logout" onClick={handleLogout}>
            <span className="nav-icon">↪</span>Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-search">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search patients, phone number, disease..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn">🔔<span className="notif-dot"></span></button>
            <button className="topbar-icon-btn">⊞</button>
            
            {/* Clickable Profile Profile Dropdown */}
            <div 
              className="topbar-profile" 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <div className="topbar-profile-info">
                <span className="topbar-profile-name">{userName}</span>
                <span className="topbar-profile-role">Front Desk Lead</span>
              </div>
              <div className="topbar-avatar">
                {userName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>

              {showProfileDropdown && (
                <div className="profile-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-header">
                    <h4>User Account Info</h4>
                  </div>
                  <div className="dropdown-body">
                    <p><strong>Name:</strong> {userName}</p>
                    <p><strong>Staff ID:</strong> {user.staffId || user.staff_id || 'N/A'}</p>
                    <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                    <p><strong>Role:</strong> {user.role ? String(user.role).toUpperCase() : 'RECEPTIONIST'}</p>
                  </div>
                  <div className="dropdown-footer">
                    <button className="dropdown-logout-btn" onClick={handleLogout}>
                      Logout Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <div className="page-title-row">
            <div className="page-title">
              <h1>{activeTab === 'dashboard' ? 'Receptionist Dashboard' : 'Patients Directory'}</h1>
              <p>
                {activeTab === 'dashboard' 
                  ? 'Welcome back! Register patients and manage patient directory records here.'
                  : 'View and manage all registered patient records and their appointed/assigned doctors.'}
              </p>
            </div>
          </div>

          {activeTab === 'dashboard' ? (
            <>
              {/* Stats Cards */}
              <div className="stat-cards">
                <div className="stat-card">
                  <div className="stat-icon blue">👥</div>
                  <div className="stat-info">
                    <div className="stat-label">Total Registered Patients</div>
                    <div className="stat-value">{totalCount}</div>
                  </div>
                  <span className="stat-badge blue">Active Database</span>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple">♂</div>
                  <div className="stat-info">
                    <div className="stat-label">Male Patients</div>
                    <div className="stat-value">{maleCount}</div>
                  </div>
                  <span className="stat-badge green">{(totalCount > 0 ? (maleCount/totalCount)*100 : 0).toFixed(0)}%</span>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">♀</div>
                  <div className="stat-info">
                    <div className="stat-label">Female Patients</div>
                    <div className="stat-value">{femaleCount}</div>
                  </div>
                  <span className="stat-badge green">{(totalCount > 0 ? (femaleCount/totalCount)*100 : 0).toFixed(0)}%</span>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="content-grid">
                {/* Patients Table Panel */}
                <div className="table-card">
                  <div className="table-card-header">
                    <h2>Recent Patients</h2>
                    <div className="table-card-controls">
                      <input 
                        type="text" 
                        className="table-search-input" 
                        placeholder="Search table..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                      />
                    </div>
                  </div>

                  <table className="patient-table">
                    <thead>
                      <tr>
                        <th>Patient ID &amp; Name</th>
                        <th>Gender &amp; DOB</th>
                        <th>Phone / Email</th>
                        <th>Disease / Visit</th>
                        <th>Assigned Doctor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading patient records...</td>
                        </tr>
                      ) : filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No patient records found.</td>
                        </tr>
                      ) : (
                        filteredPatients.map(p => (
                          <tr key={p.patientId}>
                            <td>
                              <div className="patient-info-cell">
                                <div className="patient-avatar">
                                  {p.name ? String(p.name).split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() : 'P'}
                                </div>
                                <div className="patient-name-container">
                                  <span className="patient-name-text">{p.name}</span>
                                  <span className="patient-id-text">PT-{p.patientId}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`patient-gender-badge ${p.gender ? String(p.gender).toLowerCase() : ''}`}>
                                {p.gender}
                              </span>
                              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                DOB: {p.dob || 'N/A'}
                              </div>
                            </td>
                            <td>
                              <div>{p.phoneNumber || 'N/A'}</div>
                              {p.email && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{p.email}</div>}
                            </td>
                            <td>
                              <strong style={{ color: '#334155' }}>{p.disease || 'General Checkup'}</strong>
                            </td>
                            <td>
                              {p.doctorName ? (
                                <span className="doctor-badge">👨‍⚕️ {p.doctorName}</span>
                              ) : (
                                <span className="no-doctor-badge">Unassigned</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <div className="table-footer">
                    <span>Showing {filteredPatients.length} of {patients.length} patients</span>
                  </div>
                </div>

                {/* Quick Registration Form Panel */}
                <div className="side-card">
                  <div className="side-card-header">
                    <h2>Quick Patient Registration</h2>
                  </div>
                  
                  <form className="registration-form" onSubmit={handleSubmit}>
                    {message.text && (
                      <div className={`alert alert-${message.type}`}>
                        {message.text}
                      </div>
                    )}

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor="patientId">Patient ID</label>
                        <input 
                          type="text" 
                          id="patientId" 
                          name="patientId" 
                          value="Auto-generated" 
                          disabled
                          style={{ backgroundColor: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="gender">Gender</label>
                        <select 
                          id="gender" 
                          name="gender" 
                          value={formData.gender} 
                          onChange={handleInputChange} 
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="name">Full Name</label>
                      <input 
                        type="text" 
                        id="name" 
                        name="name" 
                        placeholder="e.g. John Doe" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>

                    <div className="form-group-row">
                      <div className="form-group">
                        <label htmlFor="dob">Date of Birth</label>
                        <input 
                          type="date" 
                          id="dob" 
                          name="dob" 
                          value={formData.dob} 
                          onChange={handleInputChange} 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="phoneNumber">Phone Number</label>
                        <input 
                          type="text" 
                          id="phoneNumber" 
                          name="phoneNumber" 
                          placeholder="+94 77 123 4567" 
                          value={formData.phoneNumber} 
                          onChange={handleInputChange} 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        placeholder="john.doe@gmail.com" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="address">Physical Address</label>
                      <input 
                        type="text" 
                        id="address" 
                        name="address" 
                        placeholder="e.g. 123 Main St, Colombo" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="disease">Disease / Visit Reason</label>
                      <input 
                        type="text" 
                        id="disease" 
                        name="disease" 
                        placeholder="e.g. Fever, Routine Checkup" 
                        value={formData.disease} 
                        onChange={handleInputChange} 
                      />
                    </div>

                    {/* Assigned Doctor Dropdown */}
                    <div className="form-group">
                      <label htmlFor="doctorId">Assign Available Doctor</label>
                      <select 
                        id="doctorId" 
                        name="doctorId" 
                        value={formData.doctorId} 
                        onChange={handleInputChange}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      >
                        <option value="">-- Select Available Doctor --</option>
                        {doctors.map(doc => (
                          <option key={doc.doctorId} value={doc.doctorId}>
                            {doc.fullName} ({doc.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-register-submit" 
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Saving Patient...' : 'Register Patient (PL/SQL)'}
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            /* Patients View Tab (Full-Width Directory Table showing Assigned Doctors) */
            <div className="table-card full-width-card">
              <div className="table-card-header">
                <h2>Patients Directory (All Registered Patients)</h2>
                <div className="table-card-controls">
                  <input 
                    type="text" 
                    className="table-search-input" 
                    placeholder="Search directory..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
              </div>

              <table className="patient-table">
                <thead>
                  <tr>
                    <th>Patient ID &amp; Name</th>
                    <th>Gender &amp; DOB</th>
                    <th>Contact Details</th>
                    <th>Disease / Visit Reason</th>
                    <th>Assigned Doctor</th>
                    <th>Physical Address</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading patient records...</td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>No patient records found.</td>
                    </tr>
                  ) : (
                    filteredPatients.map(p => (
                      <tr key={p.patientId}>
                        <td>
                          <div className="patient-info-cell">
                            <div className="patient-avatar">
                              {p.name ? String(p.name).split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() : 'P'}
                            </div>
                            <div className="patient-name-container">
                              <span className="patient-name-text">{p.name}</span>
                              <span className="patient-id-text">PT-{p.patientId}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`patient-gender-badge ${p.gender ? String(p.gender).toLowerCase() : ''}`}>
                            {p.gender}
                          </span>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            DOB: {p.dob || 'N/A'}
                          </div>
                        </td>
                        <td>
                          <div><strong>Phone:</strong> {p.phoneNumber || 'N/A'}</div>
                          {p.email && <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}><strong>Email:</strong> {p.email}</div>}
                        </td>
                        <td>
                          <strong style={{ color: '#334155' }}>{p.disease || 'General Checkup'}</strong>
                        </td>
                        <td>
                          {p.doctorName ? (
                            <span className="doctor-badge">👨‍⚕️ {p.doctorName}</span>
                          ) : (
                            <span className="no-doctor-badge">Unassigned</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.address}>
                          {p.address || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="table-footer">
                <span>Showing {filteredPatients.length} of {patients.length} patients</span>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="footer">
          <span>© 2026 CarePulse Health Systems. Confidential Staff Portal.</span>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </footer>
      </div>
    </div>
  )
}
