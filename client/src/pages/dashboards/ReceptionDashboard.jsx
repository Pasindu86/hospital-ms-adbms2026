import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ReceptionDashboard.css'

const API_URL = 'http://localhost:5000/api'

export default function ReceptionDashboard() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Tabs: 'dashboard' (Register), 'appointment', 'patients' (Registry)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  // Registration Form State
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    address: '',
    phoneNumber: '',
    disease: '',
    dob: '',
    gender: 'Male'
  })

  // Appointment State
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [apptData, setApptData] = useState({
    doctorId: '',
    appointmentDate: '',
    notes: '',
    doctorCharges: '',
    hospitalCharges: ''
  })

  // Safe user parsing from localStorage
  let user = { name: 'Staff', role: 'reception' }
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      user = JSON.parse(userStr)
    }
  } catch (e) {
    console.error('Failed to parse user from localStorage', e)
  }

  const userName = user.name || 'Staff'

  // Load patients and doctors
  useEffect(() => {
    fetchPatients()
    fetchDoctors()
  }, [])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPatients(res.data || [])
    } catch (err) {
      console.error('Failed to fetch patients', err)
    } finally {
      setLoading(false)
    }
  }

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleRegSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/patients`, regData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage({ type: 'success', text: 'Patient registered successfully!' })
      setRegData({ name: '', email: '', address: '', phoneNumber: '', disease: '', dob: '', gender: 'Male' })
      fetchPatients()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to register patient.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleApptSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPatient || !apptData.doctorId || !apptData.appointmentDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' })
      return
    }
    setActionLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const token = localStorage.getItem('token')
      const doctorChargesNum = parseFloat(apptData.doctorCharges) || 0
      const hospitalChargesNum = parseFloat(apptData.hospitalCharges) || 0
      const totalPayment = doctorChargesNum + hospitalChargesNum
      await axios.post(`${API_URL}/patients/appointment`, {
        patientId: selectedPatient.patientId,
        doctorId: apptData.doctorId,
        appointmentDate: apptData.appointmentDate,
        notes: apptData.notes,
        paymentMethod: 'Cash',
        paymentStatus: 'Pending',
        doctorCharges: doctorChargesNum,
        hospitalCharges: hospitalChargesNum,
        totalPayment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage({ type: 'success', text: `Appointment booked for ${selectedPatient.name}! Total: Rs. ${totalPayment.toFixed(2)}` })
      setSelectedPatient(null)
      setApptData({ doctorId: '', appointmentDate: '', notes: '', doctorCharges: '', hospitalCharges: '' })
      setPatientSearch('')
      fetchPatients()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to book appointment.' })
    } finally {
      setActionLoading(false)
    }
  }

  const allocationSearchResults = patientSearch.trim() ? patients.filter(p =>
    (p.name || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.patientId || '').toString().includes(patientSearch) ||
    (p.email || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phoneNumber || '').includes(patientSearch)
  ).slice(0, 10) : []

  const directoryResults = patients.filter(p => {
    const term = searchTerm.toLowerCase()
    return (p.name || '').toLowerCase().includes(term) || (p.patientId || '').toString().includes(term)
  })

  return (
    <div className="reception-layout">
      {/* Sidebar - Consistent with Admin/Nurse */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">✚</div>
          <div className="sidebar-brand-text">
            <h2>CarePulse</h2>
            <span>Hospital MS</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="nav-icon">👤</span> <span className="nav-label">Registration</span>
          </button>
          <button className={`sidebar-nav-item ${activeTab === 'appointment' ? 'active' : ''}`} onClick={() => setActiveTab('appointment')}>
            <span className="nav-icon">📅</span> <span className="nav-label">Book Appointment</span>
          </button>
          <button className={`sidebar-nav-item ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
            <span className="nav-icon">📋</span> <span className="nav-label">Patient Directory</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-bottom-item logout" onClick={handleLogout}>
            <span className="nav-icon">↪</span> <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="page-title">
            <h1>{activeTab === 'dashboard' ? 'New Patient Registration' : activeTab === 'appointment' ? 'Appointment Booking' : 'Medical Registry'}</h1>
          </div>
          <div className="topbar-right">
            <div className="topbar-profile" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
              <div className="topbar-profile-info">
                <span className="topbar-profile-name">{userName}</span>
                <span className="topbar-profile-role">Receptionist</span>
              </div>
              <div className="topbar-avatar">{userName[0]}</div>
            </div>
          </div>
        </header>

        <main className="page-content">
          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {/* ADMISSION TAB */}
          {activeTab === 'dashboard' && (
            <div className="table-card full-width-card">
              <div className="table-card-header">
                <h2>Registration Form</h2>
              </div>
              <form onSubmit={handleRegSubmit} className="registration-form">
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Full Patient Name</label>
                    <input type="text" value={regData.name} onChange={(e) => setRegData({ ...regData, name: e.target.value })} required placeholder="e.g. John Doe" />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} placeholder="patient@example.com" />
                  </div>
                </div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Contact Number</label>
                    <input type="text" value={regData.phoneNumber} onChange={(e) => setRegData({ ...regData, phoneNumber: e.target.value })} placeholder="+94 7X XXX XXXX" />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" value={regData.dob} onChange={(e) => setRegData({ ...regData, dob: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Gender</label>
                    <select value={regData.gender} onChange={(e) => setRegData({ ...regData, gender: e.target.value })}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Residential Address</label>
                    <input type="text" value={regData.address} onChange={(e) => setRegData({ ...regData, address: e.target.value })} placeholder="City, Street" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Initial Symptoms / Complaint</label>
                  <textarea rows="3" value={regData.disease} onChange={(e) => setRegData({ ...regData, disease: e.target.value })} placeholder="Brief description..."></textarea>
                </div>
                <button type="submit" className="btn-register-submit" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Confirm Registration'}
                </button>
              </form>
            </div>
          )}

          {/* APPOINTMENT TAB (Enhanced Search + Details) */}
          {activeTab === 'appointment' && (
            <div className="allocation-workflow">
              <div className="search-section">
                <div className="table-card-header"><h2>1. Find Patient Profile</h2></div>
                <div className="search-box-wrap">
                  <input
                    type="text"
                    placeholder="Search by ID, Name, Email or Phone..."
                    className="search-input-fancy"
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
                  />
                </div>
                <div className="results-list">
                  {allocationSearchResults.map(p => (
                    <div key={p.patientId} className={`result-item ${selectedPatient?.patientId === p.patientId ? 'is-selected' : ''}`} onClick={() => setSelectedPatient(p)}>
                      <div className="r-info">
                        <strong>{p.name}</strong>
                        <span>{p.phoneNumber || p.email || 'No contact info'}</span>
                        <small>PT-{p.patientId} • {p.gender}</small>
                      </div>
                      {selectedPatient?.patientId === p.patientId && <div className="r-check">✓</div>}
                    </div>
                  ))}
                  {patientSearch && allocationSearchResults.length === 0 && <div className="no-res">No records found for that search.</div>}
                  {!patientSearch && <div className="no-res" style={{ paddingTop: '40px' }}>Start typing (Name/ID/Email/Phone)...</div>}
                </div>
              </div>

              <div className={`action-section ${!selectedPatient ? 'is-locked' : ''}`}>
                <div className="table-card-header"><h2>2. Booking Details</h2></div>
                {selectedPatient ? (
                  <form onSubmit={handleApptSubmit} className="registration-form">
                    <div className="selected-preview">
                      <div className="pt-tag">Booking for: <strong>{selectedPatient.name}</strong></div>
                      <p>PT-{selectedPatient.patientId} • {selectedPatient.email || selectedPatient.phoneNumber || 'N/A'}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-light)' }}>Gender: {selectedPatient.gender} | DOB: {new Date(selectedPatient.dateOfBirth || selectedPatient.dob).toLocaleDateString()}</p>
                    </div>

                    <div className="form-group">
                      <label>Select Physician</label>
                      <select value={apptData.doctorId} onChange={(e) => setApptData({ ...apptData, doctorId: e.target.value })} required>
                        <option value="">-- Choose available doctor --</option>
                        {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>Dr. {d.fullName}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Appointment Date & Time</label>
                      <input type="datetime-local" value={apptData.appointmentDate} onChange={(e) => setApptData({ ...apptData, appointmentDate: e.target.value })} required />
                    </div>

                    <div className="form-group">
                      <label>Internal Notes</label>
                      <input type="text" value={apptData.notes} onChange={(e) => setApptData({ ...apptData, notes: e.target.value })} placeholder="Internal instructions..." />
                    </div>

                    <div className="payment-breakdown-section">
                      <div className="payment-breakdown-title">💰 Payment Summary</div>
                      <div className="payment-breakdown-fields">
                        <div className="form-group">
                          <label>Doctor Charges (Rs.)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={apptData.doctorCharges}
                            onChange={(e) => setApptData({ ...apptData, doctorCharges: e.target.value })}
                            placeholder="e.g. 1500.00"
                          />
                        </div>
                        <div className="form-group">
                          <label>Hospital Charges (Rs.)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={apptData.hospitalCharges}
                            onChange={(e) => setApptData({ ...apptData, hospitalCharges: e.target.value })}
                            placeholder="e.g. 500.00"
                          />
                        </div>
                      </div>
                      <div className="payment-breakdown-total">
                        <span className="payment-total-label">Total Payment</span>
                        <span className="payment-total-value">
                          Rs. {((parseFloat(apptData.doctorCharges) || 0) + (parseFloat(apptData.hospitalCharges) || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button type="submit" className="btn-register-submit" disabled={actionLoading}>
                      {actionLoading ? 'Booking...' : 'Confirm Appointment Slot'}
                    </button>
                    <button type="button" className="txt-btn" onClick={() => setSelectedPatient(null)}>Pick Different Patient</button>
                  </form>
                ) : (
                  <div className="lock-notice" style={{ padding: '80px 20px' }}>Identify a patient profile first.</div>
                )}
              </div>
            </div>
          )}

          {/* REGISTRY TAB */}
          {activeTab === 'patients' && (
            <div className="table-card full-width-card">
              <div className="table-card-header">
                <h2>Patient Medical Registry</h2>
                <input type="text" placeholder="Filter registry..." className="table-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="patient-table">
                  <thead>
                    <tr><th>Patient Identity</th><th>Admitting Reason</th><th>Primary Physician</th><th>Contact Info</th></tr>
                  </thead>
                  <tbody>
                    {loading ? <tr><td colSpan="4">Synchronizing database...</td></tr> :
                      directoryResults.map(p => (
                        <tr key={p.patientId}>
                          <td>
                            <div className="patient-info-cell">
                              <div className="patient-avatar">{p.name?.[0] || 'P'}</div>
                              <div className="patient-name-container">
                                <span className="patient-name-text">{p.name}</span>
                                <span className="patient-id-text">PT-{p.patientId} • {p.gender}</span>
                              </div>
                            </div>
                          </td>
                          <td>{p.disease || 'Regular Checkup'}</td>
                          <td>
                            {p.doctorName ? (
                              <span className="doc-chip">Dr. {p.doctorName}</span>
                            ) : (
                              <span className="un-chip">Awaiting assignment</span>
                            )}
                          </td>
                          <td>{p.phoneNumber || p.email || 'N/A'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
