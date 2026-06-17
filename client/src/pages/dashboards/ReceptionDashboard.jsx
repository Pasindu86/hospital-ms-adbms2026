import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ReceptionDashboard.css'

const API = 'http://localhost:5000/api'

export default function ReceptionDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Register
  const [reg, setReg] = useState({ name:'', email:'', address:'', phoneNumber:'', disease:'', dob:'', gender:'Male' })

  // Book
  const [pSearch, setPSearch] = useState('')
  const [pickedPatient, setPickedPatient] = useState(null)
  const [book, setBook] = useState({ doctorId:'', appointmentDate:'', notes:'', docFee:'', hosFee:'' })
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

  // Directory
  const [filter, setFilter] = useState('')

  // User
  let user = { name:'Staff', role:'reception' }
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

  // Token fetch
  useEffect(() => {
    if (!book.doctorId || !book.appointmentDate) return
    let active = true
    axios.get(`${API}/reception/doctor/${book.doctorId}/token?date=${book.appointmentDate}`)
      .then(r => { if (active) setNextToken(r.data.nextToken) })
      .catch(() => { if (active) setNextToken(null) })
    return () => { active = false }
  }, [book.doctorId, book.appointmentDate])

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
    setMsg({type:'',text:''})
    try {
      await axios.post(`${API}/patients`, reg, authHeader())
      setMsg({type:'success', text:'Patient registered successfully!'})
      setReg({ name:'', email:'', address:'', phoneNumber:'', disease:'', dob:'', gender:'Male' })
      loadPatients()
    } catch (err) {
      setMsg({type:'error', text: err.response?.data?.error || 'Registration failed.'})
    } finally {
      setBusy(false)
    }
  }

  // 1 = Monday ... 7 = Sunday (matches DOCTOR_AVAILABILITY.DAY_OF_WEEK)
  const isoDay = (dateStr) => {
    if (!dateStr) return null
    const js = new Date(dateStr).getDay() // 0=Sun..6=Sat
    return js === 0 ? 7 : js
  }

  // Validation hint for the currently picked date/time against availability
  const selectedDayNum = book.appointmentDate ? isoDay(book.appointmentDate) : null
  const selectedDayRow = selectedDayNum ? docAvailability.find(d => d.day === selectedDayNum) : null
  const apptTimeStr = book.appointmentDate ? book.appointmentDate.slice(11, 16) : ''
  const hasSchedule = docAvailability.some(d => !d.off)
  let availabilityWarning = ''
  if (book.doctorId && hasSchedule && book.appointmentDate) {
    if (!selectedDayRow || selectedDayRow.off) {
      availabilityWarning = 'The doctor is not available on this day.'
    } else if (apptTimeStr && (apptTimeStr < selectedDayRow.startTime || apptTimeStr > selectedDayRow.endTime)) {
      availabilityWarning = `Outside working hours (${selectedDayRow.startTime}–${selectedDayRow.endTime}).`
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  // The availability row for whatever date the receptionist picked
  const bookDayNum = bookDate ? isoDay(bookDate) : null
  const bookDayRow = bookDayNum ? docAvailability.find(d => d.day === bookDayNum) : null

  // Build 30-minute time slots between the doctor's start/end hours for that day
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

  // When a doctor has no fixed schedule, fall back to a generic working-hours list
  const fallbackSlots = (!hasSchedule && book.doctorId) ? buildSlots('08:00', '20:00') : []
  const slotsToShow = hasSchedule ? timeSlots : fallbackSlots

  const pickedTime = book.appointmentDate ? book.appointmentDate.slice(11, 16) : ''

  const selectDate = (dateStr) => {
    setBookDate(dateStr)
    // Reset any previously picked time when the date changes
    setBook(prev => ({ ...prev, appointmentDate: '' }))
    setNextToken(null)
  }

  const selectSlot = (time) => {
    if (!bookDate) return
    setBook(prev => ({ ...prev, appointmentDate: `${bookDate}T${time}` }))
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (!pickedPatient || !book.doctorId || !book.appointmentDate) {
      setMsg({type:'error', text:'Complete all required fields.'})
      return
    }
    setBusy(true)
    setMsg({type:'',text:''})
    try {
      const df = parseFloat(book.docFee)||0, hf = parseFloat(book.hosFee)||0
      await axios.post(`${API}/patients/appointment`, {
        patientId: pickedPatient.patientId, doctorId: book.doctorId,
        appointmentDate: book.appointmentDate, notes: book.notes,
        paymentMethod:'Cash', paymentStatus:'Pending',
        doctorCharges: df, hospitalCharges: hf, totalPayment: df+hf
      }, authHeader())
      setMsg({type:'success', text:`Booked! Token #${nextToken||'—'} for ${pickedPatient.name}. Total: Rs. ${(df+hf).toFixed(2)}`})
      setPickedPatient(null)
      setBook({doctorId:'',appointmentDate:'',notes:'',docFee:'',hosFee:''})
      setPSearch('')
      setNextToken(null)
      loadPatients()
      setDocAvailability([])
      setBookDate('')
    } catch (err) {
      setMsg({type:'error', text: err.response?.data?.error || 'Booking failed.'})
    } finally {
      setBusy(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  // Helpers
  const uniq = Array.from(new Map(patients.map(p => [p.patientId, p])).values())
  const searchHits = pSearch.trim() ? uniq.filter(p =>
    (p.name||'').toLowerCase().includes(pSearch.toLowerCase()) ||
    String(p.patientId).includes(pSearch) ||
    (p.email||'').toLowerCase().includes(pSearch.toLowerCase()) ||
    (p.phoneNumber||'').includes(pSearch)
  ).slice(0, 8) : []
  const dirResults = uniq.filter(p => {
    const t = filter.toLowerCase()
    return (p.name||'').toLowerCase().includes(t) || String(p.patientId).includes(t)
  })

  return (
    <div className="reception-layout">
      {/* Sidebar - Consistent with Admin/Nurse */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">✓</div>
          <div className="sidebar-brand-text">
            <h2>CarePulse</h2>
            <span>Hospital MS</span>
          </div>
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
          <button className={`sidebar-nav-item ${tab === 'directory' ? 'active' : ''}`} onClick={() => setTab('directory')}>
            <span className="nav-label">Patient Directory</span>
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
              {tab === 'directory' && 'Patient Medical Directory'}
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
                    <div className="rx-stat-value">{new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short'})}</div>
                  </div>
                </div>
                <div className="rx-stat">
                  <div>
                    <div className="rx-stat-label">Quick Actions</div>
                    <div style={{marginTop:4}}>
                      <button className="rx-btn rx-btn-teal" style={{padding:'6px 14px', fontSize:12}} onClick={() => setTab('book')}>
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
                    </div>
                  </div>
                ))}
                {doctors.length === 0 && <div className="rx-empty-state">No doctors registered.</div>}
              </div>
            </>
          )}

          {/* ════════ REGISTER ════════ */}
          {tab === 'register' && (
            <div className="rx-panel" style={{maxWidth: 700}}>
              <div className="rx-panel-head"><h3>New Patient Registration</h3></div>
              <div className="rx-panel-body">
                <form onSubmit={handleRegister} className="rx-form">
                  <div className="rx-form-row">
                    <div className="rx-field">
                      <label>Full Name *</label>
                      <input value={reg.name} onChange={e => setReg({...reg, name:e.target.value})} required placeholder="Patient name" />
                    </div>
                    <div className="rx-field">
                      <label>Email</label>
                      <input type="email" value={reg.email} onChange={e => setReg({...reg, email:e.target.value})} placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="rx-form-row">
                    <div className="rx-field">
                      <label>Phone</label>
                      <input value={reg.phoneNumber} onChange={e => setReg({...reg, phoneNumber:e.target.value})} placeholder="+94 7X XXX XXXX" />
                    </div>
                    <div className="rx-field">
                      <label>Date of Birth *</label>
                      <input type="date" value={reg.dob} onChange={e => setReg({...reg, dob:e.target.value})} required />
                    </div>
                  </div>
                  <div className="rx-form-row">
                    <div className="rx-field">
                      <label>Gender</label>
                      <select value={reg.gender} onChange={e => setReg({...reg, gender:e.target.value})}>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div className="rx-field">
                      <label>Address</label>
                      <input value={reg.address} onChange={e => setReg({...reg, address:e.target.value})} placeholder="City, Street" />
                    </div>
                  </div>
                  <div className="rx-field">
                    <label>Symptoms / Complaint</label>
                    <textarea value={reg.disease} onChange={e => setReg({...reg, disease:e.target.value})} placeholder="Brief description..." />
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
              {/* Left — Patient Search */}
              <div className="rx-panel">
                <div className="rx-panel-head"><h3>Select Patient</h3></div>
                <div className="rx-panel-body" style={{paddingBottom: 4}}>
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

              {/* Right — Booking Form */}
              <div className={`rx-panel ${!pickedPatient ? 'rx-locked-panel' : ''}`}>
                <div className="rx-panel-head"><h3>Booking Details</h3></div>
                <div className="rx-panel-body">
                  {pickedPatient ? (
                    <form onSubmit={handleBook} className="rx-form">
                      <div className="rx-selected-patient">
                        <div>
                          <strong>{pickedPatient.name}</strong>
                          <span style={{display:'block'}}>PT-{pickedPatient.patientId} · {pickedPatient.email || pickedPatient.phoneNumber || '—'}</span>
                        </div>
                      </div>

                      <div className="rx-field">
                        <label>Doctor *</label>
                        <select value={book.doctorId} onChange={e => {
                          const id = e.target.value
                          const d = doctors.find(x => String(x.doctorId) === String(id))
                          setBook({...book, doctorId: id,
                            docFee: d ? d.consultationFee : '',
                            hosFee: d && d.hospitalCharge ? d.hospitalCharge : (id ? '500' : '')
                          })
                          setBookDate('')
                          setNextToken(null)
                          fetchDoctorAvailability(id)
                        }} required>
                          <option value="">Choose doctor</option>
                          {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>Dr. {d.fullName} — Rs. {d.consultationFee||0}</option>)}
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
                            <div className="availability-note">No fixed schedule set — this doctor can be booked any time.</div>
                          ) : (
                            <div className="availability-grid">
                              {docAvailability.map(d => {
                                const isPicked = selectedDayNum === d.day
                                return (
                                  <div
                                    key={d.day}
                                    className={`availability-day ${d.off ? 'is-off' : 'is-on'} ${isPicked ? 'is-picked' : ''}`}
                                  >
                                    <span className="availability-day-name">{d.label.slice(0, 3)}</span>
                                    <span className="availability-day-time">
                                      {d.off ? 'Off' : `${d.startTime}–${d.endTime}`}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="rx-field">
                        <label>Date *</label>
                        <input
                          type="date"
                          min={todayStr}
                          value={bookDate}
                          onChange={(e) => selectDate(e.target.value)}
                          required
                        />
                      </div>

                      {bookDate && (
                        <>
                          {hasSchedule && (!bookDayRow || bookDayRow.off) ? (
                            <div className="availability-inline warn">⚠ The doctor is not available on {new Date(bookDate + 'T00:00').toLocaleDateString(undefined, { weekday: 'long' })}. Please pick another date.</div>
                          ) : slotsToShow.length > 0 ? (
                            <div className="slot-picker">
                              <div className="slot-picker-head">
                                Available times{bookDayRow && !bookDayRow.off ? ` (${bookDayRow.startTime}–${bookDayRow.endTime})` : ''}:
                              </div>
                              <div className="slot-grid">
                                {slotsToShow.map(t => (
                                  <button
                                    type="button"
                                    key={t}
                                    className={`slot-btn ${pickedTime === t ? 'is-active' : ''}`}
                                    onClick={() => selectSlot(t)}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}

                      {availabilityWarning && (
                        <div className="availability-inline warn">⚠ {availabilityWarning}</div>
                      )}
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
                        <input value={book.notes} onChange={e => setBook({...book, notes:e.target.value})} placeholder="Optional notes..." />
                      </div>

                      <div className="rx-pay-box">
                        <div className="rx-pay-title">Payment Summary</div>
                        <div className="rx-pay-row"><span>Doctor Fee</span><span>Rs. {parseFloat(book.docFee)||0}</span></div>
                        <div className="rx-pay-row"><span>Hospital Fee</span><span>Rs. {parseFloat(book.hosFee)||0}</span></div>
                        <div className="rx-pay-total">
                          <span>Total</span>
                          <span>Rs. {((parseFloat(book.docFee)||0)+(parseFloat(book.hosFee)||0)).toFixed(2)}</span>
                        </div>
                      </div>

                      <button type="submit" className="rx-btn rx-btn-teal" disabled={busy || !!availabilityWarning} style={{width:'100%'}}>
                        {busy ? 'Booking...' : availabilityWarning ? 'Doctor Unavailable at This Time' : 'Confirm Booking'}
                      </button>
                      <button type="button" className="rx-btn rx-btn-ghost" onClick={() => { setPickedPatient(null); setNextToken(null) }} style={{width:'100%'}}>
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
                      <div className="rx-dlist-fee">Rs.{d.consultationFee||0}</div>
                    </div>
                  ))}
                  {doctors.length === 0 && <div className="rx-empty-state">No doctors.</div>}
                </div>
              </div>

              <div className="rx-panel">
                {viewDoc ? (
                  <>
                    <div className="rx-panel-head">
                      <h3>Queue — Dr. {viewDoc.fullName}</h3>
                      <input type="date" className="rx-date-picker" value={viewDate} onChange={e => { setViewDate(e.target.value); setQueueLoading(true); }} />
                    </div>
                    <div style={{overflowX:'auto'}}>
                      {queueLoading ? (
                        <div className="rx-empty-state">Loading queue...</div>
                      ) : queue.length > 0 ? (
                        <table className="rx-queue-table">
                          <thead><tr><th>Token</th><th>Patient</th><th>Time</th><th>Status</th><th>Payment</th></tr></thead>
                          <tbody>
                            {queue.map(b => (
                              <tr key={b.APPOINTMENT_ID}>
                                <td><span className="rx-token-num">{b.TOKEN_NUMBER}</span></td>
                                <td><strong style={{color:'var(--text)'}}>{b.PATIENT_NAME}</strong></td>
                                <td>{new Date(b.APPOINTMENT_DATE).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                <td><span className={`rx-badge ${b.STATUS.toLowerCase()}`}>{b.STATUS}</span></td>
                                <td><span className={`rx-badge ${b.PAYMENT_STATUS.toLowerCase()}`}>{b.PAYMENT_STATUS}</span></td>
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

          {/* ════════ DIRECTORY ════════ */}
          {tab === 'directory' && (
            <div className="rx-panel">
              <div className="rx-panel-head">
                <h3>Patient Directory</h3>
                <input className="rx-filter" placeholder="Filter by name or ID..." value={filter} onChange={e => setFilter(e.target.value)} />
              </div>
              <div style={{overflowX:'auto'}}>
                <table className="rx-queue-table">
                  <thead><tr><th>Patient</th><th>Condition</th><th>Doctor</th><th>Contact</th></tr></thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="4" style={{textAlign:'center', padding:30}}>Loading...</td></tr>
                    ) : dirResults.map(p => (
                      <tr key={p.patientId}>
                        <td>
                          <div className="rx-dir-cell">
                            <div className="rx-dir-initials">{p.name?.[0] || 'P'}</div>
                            <div className="rx-dir-details">
                              <strong>{p.name}</strong>
                              <small>PT-{p.patientId} · {p.gender}</small>
                            </div>
                          </div>
                        </td>
                        <td>{p.disease || 'Checkup'}</td>
                        <td>{p.doctorName ? <span className="rx-chip doc">Dr. {p.doctorName}</span> : <span className="rx-chip none">Unassigned</span>}</td>
                        <td>{p.phoneNumber || p.email || '—'}</td>
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
