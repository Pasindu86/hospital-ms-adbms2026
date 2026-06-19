import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ReceptionDashboard.css'

const API = 'http://localhost:5000/api'

const DAY_LABELS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ReceptionDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Register
  const [reg, setReg] = useState({ name: '', email: '', address: '', phoneNumber: '', disease: '', dob: '', gender: 'Male' })

  // Book
  const [pSearch, setPSearch] = useState('')
  const [pickedPatient, setPickedPatient] = useState(null)
  const [book, setBook] = useState({ doctorId: '', appointmentDate: '', notes: '', docFee: '', hosFee: '' })
  const [nextToken, setNextToken] = useState(null)

  // Doctor availability state
  const [docAvailability, setDocAvailability] = useState([])
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [bookDate, setBookDate] = useState('')

  // Tokens view
  const [viewDoc, setViewDoc] = useState(null)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])
  const [queue, setQueue] = useState([])
  const [queueLoading, setQueueLoading] = useState(false)

  // Receipt modal
  const [receipt, setReceipt] = useState(null)

  // Patient History
  const [historySearch, setHistorySearch] = useState('')
  const [selectedHistoryPatient, setSelectedHistoryPatient] = useState(null)
  const [patientHistoryList, setPatientHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // User
  let user = { name: 'Staff', role: 'reception' }
  try {
    const u = localStorage.getItem('user')
    if (u) user = JSON.parse(u)
  } catch (err) {
    console.warn('Failed to parse user from localStorage', err)
  }
  const userName = user.name || 'Staff'

  const authHeader = useCallback(() => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }), [])

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const r = await axios.get(`${API}/patients`, authHeader())
      setPatients(r.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [authHeader])

  const loadDoctors = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/patients/doctors`, authHeader())
      setDoctors(r.data || [])
    } catch (e) {
      console.error(e)
    }
  }, [authHeader])

  useEffect(() => {
    Promise.resolve().then(() => {
      loadPatients()
      loadDoctors()
    })
  }, [loadPatients, loadDoctors])

  const fetchDoctorAvailability = useCallback(async (doctorId) => {
    if (!doctorId) {
      setDocAvailability([])
      return
    }
    setLoadingAvail(true)
    try {
      const res = await axios.get(`${API}/patients/doctors/${doctorId}/availability`, authHeader())
      setDocAvailability(res.data.availability || [])
    } catch (err) {
      console.error('Failed to fetch doctor availability', err)
      setDocAvailability([])
    } finally {
      setLoadingAvail(false)
    }
  }, [authHeader])

  const fetchPatientHistory = useCallback(async (patientId) => {
    if (!patientId) return
    setHistoryLoading(true)
    try {
      const res = await axios.get(`${API}/reception/patient/${patientId}/history`, authHeader())
      setPatientHistoryList(res.data || [])
    } catch (err) {
      console.error('Failed to fetch patient history', err)
      setPatientHistoryList([])
    } finally {
      setHistoryLoading(false)
    }
  }, [authHeader])

  useEffect(() => {
    if (selectedHistoryPatient) {
      fetchPatientHistory(selectedHistoryPatient.patientId)
    }
  }, [selectedHistoryPatient, fetchPatientHistory])

  const calculateTimeFromToken = (startTimeStr, tokenNum) => {
    if (!startTimeStr || !tokenNum) return ''
    const [hours, minutes] = startTimeStr.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + (tokenNum - 1) * 30
    const targetHours = Math.floor(totalMinutes / 60) % 24
    const targetMinutes = totalMinutes % 60
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(targetHours)}:${pad(targetMinutes)}`
  }

  const getTwoWeekDates = (availability) => {
    const activeDays = new Set((availability || []).filter(d => !d.off).map(d => d.day))
    const list = []
    const today = new Date()
    const jsDay = today.getDay()
    const diffToMon = jsDay === 0 ? -6 : 1 - jsDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMon)

    for (let i = 0; i < 14; i++) {
      const current = new Date(monday)
      current.setDate(monday.getDate() + i)
      const jd = current.getDay()
      const isoD = jd === 0 ? 7 : jd
      const yyyy = current.getFullYear()
      const mm = String(current.getMonth() + 1).padStart(2, '0')
      const dd = String(current.getDate()).padStart(2, '0')
      const dateStr = `${yyyy}-${mm}-${dd}`
      const isPast = current < new Date(new Date().setHours(0, 0, 0, 0))
      list.push({
        dateStr,
        dayNum: isoD,
        dayLabel: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][jd],
        dateLabel: `${current.getDate()} ${current.toLocaleString('default', { month: 'short' })}`,
        available: activeDays.has(isoD) && !isPast,
        isPast,
        isToday: dateStr === todayStr,
        weekNum: Math.floor(i / 7)
      })
    }
    return list
  }

  useEffect(() => {
    if (!book.doctorId || !bookDate) return
    let active = true
    axios.get(`${API}/reception/doctor/${book.doctorId}/token?date=${bookDate}`)
      .then(r => { if (active) setNextToken(r.data.nextToken) })
      .catch(() => { if (active) setNextToken(null) })
    return () => { active = false }
  }, [book.doctorId, bookDate])

  useEffect(() => {
    if (!bookDate || !nextToken || !book.doctorId) {
      return
    }
    const dayNum = isoDay(bookDate)
    const dayRow = docAvailability.find(d => d.day === dayNum)
    if (dayRow && !dayRow.off && dayRow.startTime) {
      const calculatedTime = calculateTimeFromToken(dayRow.startTime, nextToken)
      setBook(prev => ({ ...prev, appointmentDate: `${bookDate}T${calculatedTime}` }))
    } else {
      setBook(prev => ({ ...prev, appointmentDate: '' }))
    }
  }, [bookDate, nextToken, docAvailability, book.doctorId])

  useEffect(() => {
    if (!viewDoc) return
    let active = true
    axios.get(`${API}/reception/doctor/${viewDoc.doctorId}/bookings?date=${viewDate}`)
      .then(r => { if (active) setQueue(r.data.bookings || []) })
      .catch(() => { if (active) setQueue([]) })
      .finally(() => { if (active) setQueueLoading(false) })
    return () => { active = false }
  }, [viewDoc, viewDate])

  const handleRegister = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg({ type: '', text: '' })
    try {
      await axios.post(`${API}/patients`, reg, authHeader())
      setMsg({ type: 'success', text: 'Patient registered successfully!' })
      setReg({ name: '', email: '', address: '', phoneNumber: '', disease: '', dob: '', gender: 'Male' })
      loadPatients()
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Registration failed.' })
    } finally {
      setBusy(false)
    }
  }

  const isoDay = (dateStr) => {
    if (!dateStr) return null
    const js = new Date(dateStr).getDay()
    return js === 0 ? 7 : js
  }

  const selectedDayNum = book.appointmentDate ? isoDay(book.appointmentDate) : null
  const selectedDayRow = selectedDayNum ? docAvailability.find(d => d.day === selectedDayNum) : null
  const apptTimeStr = book.appointmentDate ? book.appointmentDate.slice(11, 16) : ''
  const hasSchedule = docAvailability.some(d => !d.off)
  let availabilityWarning = ''
  if (book.doctorId && book.appointmentDate) {
    if (!hasSchedule) {
      availabilityWarning = 'This doctor has no available schedule set.'
    } else if (!selectedDayRow || selectedDayRow.off) {
      availabilityWarning = 'The doctor is not available on this day.'
    } else if (apptTimeStr && (apptTimeStr < selectedDayRow.startTime || apptTimeStr > selectedDayRow.endTime)) {
      availabilityWarning = `Outside working hours (${selectedDayRow.startTime}–${selectedDayRow.endTime}).`
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const bookDayNum = bookDate ? isoDay(bookDate) : null
  const bookDayRow = bookDayNum ? docAvailability.find(d => d.day === bookDayNum) : null

  const pickedTime = book.appointmentDate ? book.appointmentDate.slice(11, 16) : ''

  const selectDate = (dateStr) => {
    setBookDate(dateStr)
    setBook(prev => ({ ...prev, appointmentDate: '' }))
    setNextToken(null)
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (!pickedPatient || !book.doctorId || !book.appointmentDate) {
      setMsg({ type: 'error', text: 'Complete all required fields.' })
      return
    }
    setBusy(true)
    setMsg({ type: '', text: '' })
    try {
      const df = parseFloat(book.docFee) || 0, hf = parseFloat(book.hosFee) || 0
      const selectedDoctor = doctors.find(d => String(d.doctorId) === String(book.doctorId))
      await axios.post(`${API}/patients/appointment`, {
        patientId: pickedPatient.patientId, doctorId: book.doctorId,
        appointmentDate: book.appointmentDate, notes: book.notes,
        paymentMethod: 'Cash', paymentStatus: 'Pending',
        doctorCharges: df, hospitalCharges: hf, totalPayment: df + hf
      }, authHeader())

      setReceipt({
        token: nextToken || '—',
        patient: pickedPatient,
        doctor: selectedDoctor,
        appointmentDate: book.appointmentDate,
        pickedTime,
        notes: book.notes,
        docFee: df,
        hosFee: hf,
        total: df + hf,
        paymentMethod: 'Cash',
        paymentStatus: 'Pending',
        issuedAt: new Date().toLocaleString()
      })

      setPickedPatient(null)
      setBook({ doctorId: '', appointmentDate: '', notes: '', docFee: '', hosFee: '' })
      setPSearch('')
      setNextToken(null)
      loadPatients()
      setDocAvailability([])
      setBookDate('')
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Booking failed.' })
    } finally {
      setBusy(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const uniq = Array.from(new Map(patients.map(p => [p.patientId, p])).values())

  const searchHits = pSearch.trim() ? uniq.filter(p =>
    (p.name || '').toLowerCase().includes(pSearch.toLowerCase()) ||
    String(p.patientId).includes(pSearch) ||
    (p.email || '').toLowerCase().includes(pSearch.toLowerCase()) ||
    (p.phoneNumber || '').includes(pSearch)
  ).slice(0, 8) : []

  const historySearchHits = historySearch.trim() ? uniq.filter(p =>
    (p.name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    String(p.patientId).includes(historySearch) ||
    (p.email || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (p.phoneNumber || '').includes(historySearch)
  ).slice(0, 8) : []

  return (
    <div className="reception-layout">
      {/* Sidebar - Nurse Style */}
      <aside className="rec-sidebar">
        <div className="rec-sidebar-brand">
          <div className="rec-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /></svg>
          </div>
          <div className="sidebar-brand-text">
            <h2>CarePulse</h2>
            <span>Reception Portal</span>
          </div>
        </div>

        <nav className="rec-sidebar-nav">
          <button className={`rec-nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
            Overview
          </button>
          <button className={`rec-nav-item ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
            Registration
          </button>
          <button className={`rec-nav-item ${tab === 'book' ? 'active' : ''}`} onClick={() => setTab('book')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            Book Appointment
          </button>
          <button className={`rec-nav-item ${tab === 'tokens' ? 'active' : ''}`} onClick={() => setTab('tokens')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
            Token Queue
          </button>
          <button className={`rec-nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Patient History
          </button>

          <button className="rec-logout-btn" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content - Nurse Style */}
      <main className="rec-main-area">
        <header className="rec-header">
          <div>
            <h1 className="rec-welcome">Welcome back, {userName}</h1>
            <p className="rec-subtitle">
              {tab === 'overview' && 'Dashboard overview at a glance'}
              {tab === 'register' && 'Register a new patient'}
              {tab === 'book' && 'Book a patient appointment'}
              {tab === 'tokens' && 'View doctor token queues'}
              {tab === 'history' && 'View patient booking history'}
            </p>
          </div>
          <div className="rec-user-info">
            <div className="rec-avatar-circle">{userName.substring(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{userName}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Receptionist</div>
            </div>
          </div>
        </header>

        {msg.text && <div className={`rx-alert ${msg.type}`}>{msg.type === 'success' ? '✓' : '✗'} {msg.text}</div>}

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div className="rx-stats-strip">
              <div className="rx-stat">
                <div>
                  <div className="rx-stat-label">Total Patients</div>
                  <div className="rx-stat-value">{uniq.length}</div>
                </div>
              </div>
              <div className="rx-stat">
                <div>
                  <div className="rx-stat-label">Doctors</div>
                  <div className="rx-stat-value">{doctors.length}</div>
                </div>
              </div>
              <div className="rx-stat">
                <div>
                  <div className="rx-stat-label">Today</div>
                  <div className="rx-stat-value">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                </div>
              </div>
              <div className="rx-stat">
                <div>
                  <div className="rx-stat-label">Quick Actions</div>
                  <div style={{ marginTop: 4 }}>
                    <button className="rx-btn rx-btn-teal" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setTab('book')}>
                      + New Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rx-section-title">Available Doctors</div>
            <div className="rx-doctor-grid">
              {doctors.map(d => (
                <div key={d.doctorId} className="rx-doctor-card" onClick={() => { setViewDoc(d); setTab('tokens'); setQueueLoading(true); }}>
                  <div className="rx-doc-avatar">Dr</div>
                  <div className="rx-doc-info">
                    <div className="rx-doc-name">Dr. {d.fullName}</div>
                    <div className="rx-doc-spec">{d.specialistArea || 'General Practice'}</div>
                    <div className="rx-doc-fee">Rs. {d.consultationFee || 0}</div>
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '11px' }}>
                      <strong style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Weekly Availability:</strong>
                      {d.availability && d.availability.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {d.availability.map(av => (
                            <div key={av.day} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                              <span>{DAY_LABELS[av.day]}:</span>
                              <span>{av.startTime} - {av.endTime}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#ef4444' }}>No availability set</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {doctors.length === 0 && <div className="rx-empty-state">No doctors registered.</div>}
            </div>
          </>
        )}

        {/* REGISTER */}
        {tab === 'register' && (
          <div className="rx-panel" style={{ maxWidth: 700 }}>
            <div className="rx-panel-head"><h3>New Patient Registration</h3></div>
            <div className="rx-panel-body">
              <form onSubmit={handleRegister} className="rx-form">
                <div className="rx-form-row">
                  <div className="rx-field">
                    <label>Full Name *</label>
                    <input value={reg.name} onChange={e => setReg({ ...reg, name: e.target.value })} required placeholder="Patient name" />
                  </div>
                  <div className="rx-field">
                    <label>Email</label>
                    <input type="email" value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} placeholder="email@example.com" />
                  </div>
                </div>
                <div className="rx-form-row">
                  <div className="rx-field">
                    <label>Phone</label>
                    <input value={reg.phoneNumber} onChange={e => setReg({ ...reg, phoneNumber: e.target.value })} placeholder="+94 7X XXX XXXX" />
                  </div>
                  <div className="rx-field">
                    <label>Date of Birth *</label>
                    <input type="date" value={reg.dob} onChange={e => setReg({ ...reg, dob: e.target.value })} required />
                  </div>
                </div>
                <div className="rx-form-row">
                  <div className="rx-field">
                    <label>Gender</label>
                    <select value={reg.gender} onChange={e => setReg({ ...reg, gender: e.target.value })}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div className="rx-field">
                    <label>Address</label>
                    <input value={reg.address} onChange={e => setReg({ ...reg, address: e.target.value })} placeholder="City, Street" />
                  </div>
                </div>
                <div className="rx-field">
                  <label>Symptoms / Complaint</label>
                  <textarea value={reg.disease} onChange={e => setReg({ ...reg, disease: e.target.value })} placeholder="Brief description..." />
                </div>
                <button type="submit" className="rx-btn rx-btn-teal" disabled={busy}>
                  {busy ? 'Saving...' : 'Confirm Registration'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* BOOK APPOINTMENT */}
        {tab === 'book' && (
          <div className="rx-book-layout">
            <div className="rx-panel">
              <div className="rx-panel-head"><h3>Select Patient</h3></div>
              <div className="rx-panel-body" style={{ paddingBottom: 4 }}>
                <div className="rx-search-box">
                  <input
                    placeholder="Search name, ID, email, phone..."
                    value={pSearch}
                    onChange={e => { setPSearch(e.target.value); setPickedPatient(null); setNextToken(null) }}
                  />
                </div>
              </div>
              <div className="rx-patient-list">
                {searchHits.map(p => (
                  <div key={p.patientId} className={`rx-p-item ${pickedPatient?.patientId === p.patientId ? 'picked' : ''}`} onClick={() => setPickedPatient(p)}>
                    <div>
                      <div className="rx-p-name">{p.name}</div>
                      <div className="rx-p-sub">PT-{p.patientId} · {p.phoneNumber || p.email || '—'} · {p.gender}</div>
                    </div>
                    {pickedPatient?.patientId === p.patientId && <div className="rx-p-check">{'✓'}</div>}
                  </div>
                ))}
                {pSearch && searchHits.length === 0 && <div className="rx-empty-state">No patients found.</div>}
                {!pSearch && <div className="rx-empty-state">Type to search patients...</div>}
              </div>
            </div>

            <div className={`rx-panel ${!pickedPatient ? 'rx-locked-panel' : ''}`}>
              <div className="rx-panel-head"><h3>Booking Details</h3></div>
              <div className="rx-panel-body">
                {pickedPatient ? (
                  <form onSubmit={handleBook} className="rx-form">
                    <div className="rx-selected-patient">
                      <div>
                        <strong>{pickedPatient.name}</strong>
                        <span style={{ display: 'block' }}>PT-{pickedPatient.patientId} · {pickedPatient.email || pickedPatient.phoneNumber || '—'}</span>
                      </div>
                    </div>

                    <div className="rx-field">
                      <label>Doctor *</label>
                      <select value={book.doctorId} onChange={e => {
                        const id = e.target.value
                        const d = doctors.find(x => String(x.doctorId) === String(id))
                        setBook({
                          ...book, doctorId: id,
                          docFee: d ? d.consultationFee : '',
                          hosFee: d && d.hospitalCharge ? d.hospitalCharge : (id ? '500' : '')
                        })
                        setBookDate('')
                        setNextToken(null)
                        fetchDoctorAvailability(id)
                      }} required>
                        <option value="">Choose doctor</option>
                        {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>Dr. {d.fullName} — Rs. {d.consultationFee || 0}</option>)}
                      </select>
                    </div>
                    {book.doctorId && (
                      <div className="availability-card">
                        <div className="availability-card-head">
                          <span className="availability-icon">🕒</span>
                          <span>Doctor's Weekly Availability</span>
                        </div>
                        {loadingAvail ? (
                          <div className="availability-loading">Loading schedule…</div>
                        ) : !hasSchedule ? (
                          <div className="availability-note" style={{ color: '#ef4444' }}>No availability schedule set — this doctor cannot be booked.</div>
                        ) : (
                          <div className="availability-grid">
                            {docAvailability.map(d => {
                              const isPicked = selectedDayNum === d.day
                              return (
                                <div key={d.day} className={`availability-day ${d.off ? 'is-off' : 'is-on'} ${isPicked ? 'is-picked' : ''}`}>
                                  <span className="availability-day-name">{d.label.slice(0, 3)}</span>
                                  <span className="availability-day-time">{d.off ? 'Off' : `${d.startTime}–${d.endTime}`}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rx-field">
                      <label>Date *</label>
                      {!book.doctorId ? (
                        <div style={{ color: '#94a3b8', fontSize: '13px', padding: '8px 0' }}>Select a doctor first to see available dates.</div>
                      ) : !hasSchedule ? (
                        <div style={{ color: '#ef4444', fontSize: '13px', padding: '8px 0' }}>This doctor has no schedule set — cannot book.</div>
                      ) : (
                        <>
                          {['This Week', 'Next Week'].map((weekLabel, weekIdx) => {
                            const weekDates = getTwoWeekDates(docAvailability).filter(d => d.weekNum === weekIdx)
                            return (
                              <div key={weekLabel} style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{weekLabel}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                  {weekDates.map(d => (
                                    <button
                                      type="button"
                                      key={d.dateStr}
                                      disabled={!d.available}
                                      onClick={() => d.available && selectDate(d.dateStr)}
                                      style={{
                                        padding: '6px 2px',
                                        borderRadius: '8px',
                                        border: bookDate === d.dateStr ? '2px solid #0066fe' : '1px solid #e2e8f0',
                                        background: bookDate === d.dateStr ? '#0066fe' : d.available ? (d.isToday ? '#eff6ff' : '#ffffff') : '#f8fafc',
                                        color: bookDate === d.dateStr ? '#ffffff' : d.available ? (d.isToday ? '#0066fe' : '#1e293b') : '#cbd5e1',
                                        cursor: d.available ? 'pointer' : 'not-allowed',
                                        textAlign: 'center',
                                        fontSize: '11px',
                                        lineHeight: '1.3',
                                        fontWeight: bookDate === d.dateStr ? '700' : d.isToday ? '600' : '400',
                                        transition: 'all 0.15s',
                                        opacity: d.isPast ? 0.4 : 1
                                      }}
                                    >
                                      <div style={{ fontSize: '10px', opacity: 0.75 }}>{d.dayLabel}</div>
                                      <div>{d.dateLabel}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>

                    {bookDate && (
                      <>
                        {hasSchedule && (!bookDayRow || bookDayRow.off) ? (
                          <div className="availability-inline warn">⚠ The doctor is not available on {new Date(bookDate + 'T00:00').toLocaleDateString(undefined, { weekday: 'long' })}. Please pick another date.</div>
                        ) : book.appointmentDate && pickedTime ? (
                          <div style={{ marginTop: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '14px' }}>
                            Time: <strong>{pickedTime}</strong> (Token #{nextToken})
                          </div>
                        ) : null}
                      </>
                    )}

                    {availabilityWarning && <div className="availability-inline warn">⚠ {availabilityWarning}</div>}
                    {!availabilityWarning && book.appointmentDate && (
                      <div className="availability-inline ok">{'✓'} Booking {new Date(book.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} at {pickedTime}.</div>
                    )}

                    {nextToken !== null && (
                      <div className="rx-token-highlight">
                        <div className="rx-token-label">Your Token Number</div>
                        <div className="rx-token-big">{nextToken}</div>
                      </div>
                    )}

                    <div className="rx-field">
                      <label>Notes</label>
                      <input value={book.notes} onChange={e => setBook({ ...book, notes: e.target.value })} placeholder="Optional notes..." />
                    </div>

                    <div className="rx-pay-box">
                      <div className="rx-pay-title">Payment Summary</div>
                      <div className="rx-pay-row"><span>Doctor Fee</span><span>Rs. {parseFloat(book.docFee) || 0}</span></div>
                      <div className="rx-pay-row"><span>Hospital Fee</span><span>Rs. {parseFloat(book.hosFee) || 0}</span></div>
                      <div className="rx-pay-total">
                        <span>Total</span>
                        <span>Rs. {((parseFloat(book.docFee) || 0) + (parseFloat(book.hosFee) || 0)).toFixed(2)}</span>
                      </div>
                    </div>

                    <button type="submit" className="rx-btn rx-btn-teal" disabled={busy || !!availabilityWarning} style={{ width: '100%' }}>
                      {busy ? 'Booking...' : availabilityWarning ? 'Doctor Unavailable at This Time' : 'Confirm Booking'}
                    </button>
                    <button type="button" className="rx-btn rx-btn-ghost" onClick={() => { setPickedPatient(null); setNextToken(null) }} style={{ width: '100%' }}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="rx-empty-state">Select a patient from the left panel first.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOKEN QUEUE */}
        {tab === 'tokens' && (
          <div className="rx-tokens-layout">
            <div className="rx-panel">
              <div className="rx-panel-head"><h3>Doctors</h3></div>
              <div className="rx-doc-list-scroll">
                {doctors.map(d => (
                  <div key={d.doctorId} className={`rx-dlist-item ${viewDoc?.doctorId === d.doctorId ? 'active' : ''}`} onClick={() => { setViewDoc(d); setQueueLoading(true); }}>
                    <div className="rx-dlist-avatar">Dr</div>
                    <div className="rx-dlist-meta">
                      <h4>Dr. {d.fullName}</h4>
                      <span>{d.specialistArea || 'General'}</span>
                    </div>
                    <div className="rx-dlist-fee">Rs.{d.consultationFee || 0}</div>
                  </div>
                ))}
                {doctors.length === 0 && <div className="rx-empty-state">No doctors.</div>}
              </div>
            </div>

            <div className="rx-panel">
              {viewDoc ? (
                <>
                  <div className="rx-panel-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <h3>Queue — Dr. {viewDoc.fullName}</h3>
                      <input type="date" className="rx-date-picker" value={viewDate} onChange={e => { setViewDate(e.target.value); setQueueLoading(true); }} />
                    </div>
                    <div className="rx-queue-avail-info" style={{ fontSize: '13px', fontWeight: '500', color: viewDoc.availability?.find(av => av.day === isoDay(viewDate)) ? '#0066fe' : '#ef4444' }}>
                      📅 Schedule: {
                        (() => {
                          const qDayNum = isoDay(viewDate)
                          const qDayRow = viewDoc.availability ? viewDoc.availability.find(av => av.day === qDayNum) : null
                          return qDayRow ? `${DAY_LABELS[qDayNum]}: ${qDayRow.startTime} - ${qDayRow.endTime}` : 'Doctor is Off / Unavailable today'
                        })()
                      }
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    {queueLoading ? (
                      <div className="rx-empty-state">Loading queue...</div>
                    ) : queue.length > 0 ? (
                      <table className="rx-queue-table">
                        <thead>
                          <tr>
                            <th>Token</th>
                            <th>Patient</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Payment Method</th>
                            <th>Payment Status</th>
                            <th>Doc Fee</th>
                            <th>Hos Fee</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queue.map(b => (
                            <tr key={b.APPOINTMENT_ID}>
                              <td><span className="rx-token-num">{b.TOKEN_NUMBER}</span></td>
                              <td><strong style={{ color: '#1e293b' }}>{b.PATIENT_NAME}</strong></td>
                              <td>{new Date(b.APPOINTMENT_DATE).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                              <td><span className={`rx-badge ${b.STATUS.toLowerCase()}`}>{b.STATUS}</span></td>
                              <td>{b.PAYMENT_METHOD || 'Cash'}</td>
                              <td><span className={`rx-badge ${b.PAYMENT_STATUS.toLowerCase()}`}>{b.PAYMENT_STATUS}</span></td>
                              <td>Rs. {b.DOCTOR_FEE || 0}</td>
                              <td>Rs. {b.HOSPITAL_FEE || 0}</td>
                              <td><strong>Rs. {b.TOTAL_AMOUNT || 0}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="rx-empty-state">No bookings for this date.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rx-panel-body"><div className="rx-empty-state">Select a doctor to see their token queue</div></div>
              )}
            </div>
          </div>
        )}

        {/* PATIENT BOOKING HISTORY */}
        {tab === 'history' && (
          <div className="rx-book-layout">
            <div className="rx-panel">
              <div className="rx-panel-head"><h3>Find Patient</h3></div>
              <div className="rx-panel-body" style={{ paddingBottom: 4 }}>
                <div className="rx-search-box">
                  <input
                    placeholder="Search name, phone or email..."
                    value={historySearch}
                    onChange={e => {
                      setHistorySearch(e.target.value)
                      setSelectedHistoryPatient(null)
                      setPatientHistoryList([])
                    }}
                  />
                </div>
              </div>
              <div className="rx-patient-list">
                {historySearchHits.map(p => (
                  <div
                    key={p.patientId}
                    className={`rx-p-item ${selectedHistoryPatient?.patientId === p.patientId ? 'picked' : ''}`}
                    onClick={() => {
                      setSelectedHistoryPatient(p);
                      fetchPatientHistory(p.patientId);
                    }}
                  >
                    <div>
                      <div className="rx-p-name">{p.name}</div>
                      <div className="rx-p-sub">PT-{p.patientId} · {p.phoneNumber || 'No Phone'}</div>
                      <div className="rx-p-sub" style={{ fontSize: '11px', color: '#64748b' }}>{p.email || 'No Email'}</div>
                    </div>
                    {selectedHistoryPatient?.patientId === p.patientId && <div className="rx-p-check">{'✓'}</div>}
                  </div>
                ))}
                {historySearch && historySearchHits.length === 0 && <div className="rx-empty-state">No matching patients found.</div>}
                {!historySearch && <div className="rx-empty-state">Type a patient details to lookup history...</div>}
              </div>
            </div>

            <div className="rx-panel" style={{ flex: 2 }}>
              <div className="rx-panel-head">
                <h3>Booking History Log</h3>
              </div>
              <div className="rx-panel-body" style={{ overflowX: 'auto' }}>
                {selectedHistoryPatient ? (
                  <>
                    <div className="rx-selected-patient" style={{ marginBottom: '16px' }}>
                      <div>
                        <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', color: '#0066fe', display: 'block' }}>Selected Profile</span>
                        <strong style={{ fontSize: '16px' }}>{selectedHistoryPatient.name}</strong>
                        <span style={{ display: 'block', fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                          ID: PT-{selectedHistoryPatient.patientId} | Phone: {selectedHistoryPatient.phoneNumber || '—'} | Email: {selectedHistoryPatient.email || '—'}
                        </span>
                      </div>
                    </div>

                    {historyLoading ? (
                      <div className="rx-empty-state">Retrieving records...</div>
                    ) : patientHistoryList.length > 0 ? (
                      <table className="rx-queue-table">
                        <thead>
                          <tr>
                            <th>Date & Time</th>
                            <th>Doctor</th>
                            <th>Notes / Symptoms</th>
                            <th>Status</th>
                            <th>Payment Status</th>
                            <th>Total Charge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientHistoryList.map((h, i) => (
                            <tr key={i}>
                              <td>
                                <strong>
                                  {h.APPOINTMENT_DATE
                                    ? new Date(h.APPOINTMENT_DATE).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'
                                  }
                                </strong>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  {h.APPOINTMENT_DATE
                                    ? new Date(h.APPOINTMENT_DATE).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : ''
                                  }
                                </div>
                              </td>
                              <td>
                                <span className="rx-chip doc">
                                  Dr. {h.DOCTOR_NAME || 'Unknown'}
                                </span>
                              </td>
                              <td style={{ maxWidth: '200px', whiteSpace: 'normal', fontSize: '13px' }}>
                                {h.NOTES || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No notes provided</span>}
                              </td>
                              <td>
                                <span className={`rx-badge ${(h.STATUS || 'Scheduled').toLowerCase()}`}>
                                  {h.STATUS || 'Scheduled'}
                                </span>
                              </td>
                              <td>
                                <span className={`rx-badge ${(h.PAYMENT_STATUS || 'Pending').toLowerCase()}`}>
                                  {h.PAYMENT_STATUS || 'Pending'}
                                </span>
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{h.PAYMENT_METHOD || 'Cash'}</div>
                              </td>
                              <td>
                                <strong style={{ color: '#0f172a' }}>Rs. {h.TOTAL_AMOUNT || 0}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="rx-empty-state">This patient has no registered booking records found.</div>
                    )}
                  </>
                ) : (
                  <div className="rx-empty-state">Please select a patient from the left pane to view history logs.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Receipt Modal */}
      {receipt && (
        <div className="rx-receipt-overlay" onClick={() => setReceipt(null)}>
          <div className="rx-receipt-card" onClick={e => e.stopPropagation()}>
            <h3>Booking Confirmation</h3>
            <div className="rx-receipt-row"><span>Token</span><strong>#{receipt.token}</strong></div>
            <div className="rx-receipt-row"><span>Patient</span><span>{receipt.patient?.name}</span></div>
            <div className="rx-receipt-row"><span>Doctor</span><span>Dr. {receipt.doctor?.fullName}</span></div>
            <div className="rx-receipt-row"><span>Date</span><span>{new Date(receipt.appointmentDate).toLocaleDateString()}</span></div>
            <div className="rx-receipt-row"><span>Time</span><span>{receipt.pickedTime}</span></div>
            <div className="rx-receipt-row"><span>Doctor Fee</span><span>Rs. {receipt.docFee}</span></div>
            <div className="rx-receipt-row"><span>Hospital Fee</span><span>Rs. {receipt.hosFee}</span></div>
            <div className="rx-receipt-total"><span>Total</span><span>Rs. {receipt.total}</span></div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="rx-btn rx-btn-teal" onClick={() => setReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
