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

  // ════════ NEW: PATIENT HISTORY STATES ════════
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

  // ════════ NEW: FETCH SELECTED PATIENT'S BOOKING HISTORY ════════
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

  // Helper to calculate time based on token number (30 mins per token starting from doctor's startTime)
  const calculateTimeFromToken = (startTimeStr, tokenNum) => {
    if (!startTimeStr || !tokenNum) return ''
    const [hours, minutes] = startTimeStr.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + (tokenNum - 1) * 30
    const targetHours = Math.floor(totalMinutes / 60) % 24
    const targetMinutes = totalMinutes % 60
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(targetHours)}:${pad(targetMinutes)}`
  }

  // Generate this week + next week dates, marking available vs unavailable
  const getTwoWeekDates = (availability) => {
    const activeDays = new Set((availability || []).filter(d => !d.off).map(d => d.day))
    const list = []
    const today = new Date()
    const jsDay = today.getDay() // 0=Sun
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

  // Token fetch based on selected date
  useEffect(() => {
    if (!book.doctorId || !bookDate) return
    let active = true
    axios.get(`${API}/reception/doctor/${book.doctorId}/token?date=${bookDate}`)
      .then(r => { if (active) setNextToken(r.data.nextToken) })
      .catch(() => { if (active) setNextToken(null) })
    return () => { active = false }
  }, [book.doctorId, bookDate])

  // Automatically calculate and set the appointment time
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

  // Queue fetch
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

  const buildSlots = (start, end) => {
    const slots = []
    const toMin = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10)
    const pad = (n) => String(n).padStart(2, '0')
    for (let m = toMin(start); m <= toMin(end); m += 30) {
      slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
    }
    return slots
  }

  const timeSlots = (bookDayRow && !bookDayRow.off && bookDayRow.startTime && bookDayRow.endTime)
    ? buildSlots(bookDayRow.startTime, bookDayRow.endTime)
    : []

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

  // ════════ NEW: PATIENT SEARCH FOR THE HISTORY SECTION ════════
  const historySearchHits = historySearch.trim() ? uniq.filter(p =>
    (p.name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    String(p.patientId).includes(historySearch) ||
    (p.email || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (p.phoneNumber || '').includes(historySearch)
  ).slice(0, 8) : []

  return (
    <div className="reception-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-header">
            <div className="sidebar-brand-icon">✓</div>
            <div className="sidebar-brand-text">
              <h2>CarePulse</h2>
            </div>
          </div>
          <span className="sidebar-brand-sub">Hospital MS</span>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            <span className="nav-label">Overview</span>
          </button>
          <button className={`sidebar-nav-item ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            <span className="nav-label">Registration</span>
          </button>
          <button className={`sidebar-nav-item ${tab === 'book' ? 'active' : ''}`} onClick={() => setTab('book')}>
            <span className="nav-label">Book Appointment</span>
          </button>
          <button className={`sidebar-nav-item ${tab === 'tokens' ? 'active' : ''}`} onClick={() => setTab('tokens')}>
            <span className="nav-label">Token Queue</span>
          </button>
          <button className={`sidebar-nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            <span className="nav-label">Patient History</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-bottom-item logout" onClick={logout}>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="page-title">
            <h1>
              {tab === 'overview' && 'Dashboard Overview'}
              {tab === 'register' && 'New Patient Registration'}
              {tab === 'book' && 'Appointment Booking'}
              {tab === 'tokens' && 'Doctor Token Queues'}
              {tab === 'history' && 'Patient Booking History'}
            </h1>
          </div>
          <div className="topbar-right">
            <div className="topbar-profile">
              <div className="topbar-profile-info">
                <span className="topbar-profile-name">{userName}</span>
                <span className="topbar-profile-role">Receptionist</span>
              </div>
              <div className="topbar-avatar">{userName[0]}</div>
            </div>
          </div>
        </header>

        <main className="page-content">
          {msg.text && <div className={`rx-alert ${msg.type}`}>{msg.type === 'success' ? '✓' : '✕'} {msg.text}</div>}

          {/* ════════ OVERVIEW ════════ */}
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
                      <div className="rx-doc-hours" style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '11px' }}>
                        <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Weekly Availability:</strong>
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

          {/* ════════ REGISTER ════════ */}
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

          {/* ════════ BOOK APPOINTMENT ════════ */}
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
                      {pickedPatient?.patientId === p.patientId && <div className="rx-p-check">✓</div>}
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
                                          border: bookDate === d.dateStr ? '2px solid #0d9488' : '1px solid #e2e8f0',
                                          background: bookDate === d.dateStr ? '#0d9488' : d.available ? (d.isToday ? '#f0fdf4' : '#ffffff') : '#f8fafc',
                                          color: bookDate === d.dateStr ? '#ffffff' : d.available ? (d.isToday ? '#0d9488' : '#1e293b') : '#cbd5e1',
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
                            <div style={{ marginTop: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '14px' }}>
                              time: <strong>{pickedTime}</strong> (next Token #{nextToken})
                            </div>
                          ) : null}
                        </>
                      )}

                      {availabilityWarning && <div className="availability-inline warn">⚠ {availabilityWarning}</div>}
                      {!availabilityWarning && book.appointmentDate && (
                        <div className="availability-inline ok">✓ Booking {new Date(book.appointmentDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} at {pickedTime}.</div>
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

          {/* ════════ TOKEN QUEUE ════════ */}
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
                      <div className="rx-queue-avail-info" style={{ fontSize: '13px', fontWeight: '500', color: viewDoc.availability?.find(av => av.day === isoDay(viewDate)) ? '#0d9488' : '#ef4444' }}>
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
                                <td><strong style={{ color: 'var(--text)' }}>{b.PATIENT_NAME}</strong></td>
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

          {/* ════════ PATIENT BOOKING HISTORY VIEW ════════ */}
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
                        fetchPatientHistory(p.patientId); // TRIGERRED HISTORY FETCH ON CLICK SUCCESSFULLY
                      }}
                    >
                      <div>
                        <div className="rx-p-name">{p.name}</div>
                        <div className="rx-p-sub">PT-{p.patientId} · {p.phoneNumber || 'No Phone'}</div>
                        <div className="rx-p-sub" style={{ fontSize: '11px', color: '#64748b' }}>{p.email || 'No Email'}</div>
                      </div>
                      {selectedHistoryPatient?.patientId === p.patientId && <div className="rx-p-check">✓</div>}
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
                          <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', color: '#0d9488', display: 'block' }}>Selected Profile</span>
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
                                  <span className="rx-chip doc" style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
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
      </div>
    </div>
  )
}