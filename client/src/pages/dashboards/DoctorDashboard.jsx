import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './DoctorDashboard.css'

const API = 'http://localhost:5000/api/doctor'

function getAuthHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// ═══════════════════════════════════════════════════════════
//  Drug Search Dropdown Component
// ═══════════════════════════════════════════════════════════
function DrugSearchInput({ value, onSelect, drugName }) {
  const [query, setQuery] = useState(drugName || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q) => {
    try {
      const res = await axios.get(`${API}/drugs/search`, { params: { q }, headers: getAuthHeaders() })
      setResults(res.data.drugs || [])
    } catch { setResults([]) }
  }, [])

  const handleInput = (e) => {
    const v = e.target.value
    setQuery(v)
    setOpen(true)
    search(v)
  }

  const pick = (drug) => {
    setQuery(drug.DRUG_NAME)
    setOpen(false)
    onSelect(drug)
  }

  return (
    <div className="drug-search-wrapper" ref={ref}>
      <input
        type="text"
        placeholder="Search drug..."
        value={query}
        onChange={handleInput}
        onFocus={() => { setOpen(true); search(query) }}
      />
      {open && results.length > 0 && (
        <div className="drug-dropdown">
          {results.map(d => (
            <div key={d.DRUG_ID} className="drug-dropdown-item" onClick={() => pick(d)}>
              <div className="drug-item-name">{d.DRUG_NAME}</div>
              <div className="drug-item-meta">{d.DRUG_CODE} · Qty: {d.QUANTITY}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Main Doctor Dashboard
// ═══════════════════════════════════════════════════════════
export default function DoctorDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // State
  const [view, setView] = useState('dashboard')
  const [appointments, setAppointments] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [history, setHistory] = useState([])
  const [prescriptionHistory, setPrescriptionHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // Treatment form state
  const [diagnosis, setDiagnosis] = useState('')
  const [clinicalAdvice, setClinicalAdvice] = useState('')
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [medItems, setMedItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Fetch today's appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/appointments/today`, { headers: getAuthHeaders() })
      setAppointments(res.data.appointments || [])
    } catch (err) {
      console.error('Failed to fetch appointments', err)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // Search patients
  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const res = await axios.get(`${API}/patients/search`, { params: { q }, headers: getAuthHeaders() })
      setSearchResults(res.data.patients || [])
    } catch { setSearchResults([]) }
  }

  // Select a patient for examination
  const selectPatient = async (appt) => {
    setSelectedAppt(appt)
    setSelectedPatient({ id: appt.PATIENT_ID, name: appt.PATIENT_NAME, gender: appt.GENDER })
    setView('examination')
    setDiagnosis('')
    setClinicalAdvice('')
    setTreatmentNotes('')
    setMedItems([])
    setMessage({ type: '', text: '' })

    // Fetch history
    await loadPatientData(appt.PATIENT_ID)
  }

  // Load a patient's records & prescriptions
  const loadPatientData = async (patientId) => {
    setLoading(true)
    try {
      const histRes = await axios.get(`${API}/patients/${patientId}/history`, { headers: getAuthHeaders() })
      setHistory(histRes.data.records || [])
      setPrescriptionHistory(histRes.data.prescriptions || [])
    } catch (err) {
      console.error('Failed to load patient data', err)
      setHistory([])
      setPrescriptionHistory([])
    } finally { setLoading(false) }
  }

  // Select from the top-bar search results — opens read-only history
  const selectSearchPatient = async (patient) => {
    setSelectedPatient({ id: patient.PATIENT_ID, name: patient.NAME, gender: patient.GENDER })
    setSelectedAppt(null)
    setView('history')
    setSearchResults([])
    setSearchQuery('')
    setMessage({ type: '', text: '' })
    await loadPatientData(patient.PATIENT_ID)
  }

  // Prescription builder
  const addMedicine = () => {
    setMedItems([...medItems, { drugId: null, drugName: '', dosage: '', duration: '', instructions: '' }])
  }

  const updateMedItem = (idx, field, value) => {
    const updated = [...medItems]
    updated[idx] = { ...updated[idx], [field]: value }
    setMedItems(updated)
  }

  const removeMedItem = (idx) => {
    setMedItems(medItems.filter((_, i) => i !== idx))
  }

  const selectDrug = (idx, drug) => {
    const updated = [...medItems]
    updated[idx] = { ...updated[idx], drugId: drug.DRUG_ID, drugName: drug.DRUG_NAME }
    setMedItems(updated)
  }

  // Save treatment
  const handleSaveTreatment = async () => {
    if (!diagnosis.trim()) {
      setMessage({ type: 'error', text: 'Diagnosis is required.' })
      return
    }
    if (!selectedAppt) {
      setMessage({ type: 'error', text: 'No appointment selected. Use the queue to start an examination.' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // 1. Save treatment (medical record)
      const treatRes = await axios.post(`${API}/treatments`, {
        appointmentId: selectedAppt.APPOINTMENT_ID,
        patientId: selectedPatient.id,
        diagnosis,
        clinicalAdvice,
        treatmentNotes
      }, { headers: getAuthHeaders() })

      const recordId = treatRes.data.recordId

      // 2. Save prescription if medicines added
      if (medItems.length > 0 && medItems.some(m => m.drugId)) {
        const validItems = medItems.filter(m => m.drugId && m.dosage && m.duration)
        if (validItems.length > 0) {
          await axios.post(`${API}/prescriptions`, {
            recordId,
            patientId: selectedPatient.id,
            notes: '',
            items: validItems.map(m => ({
              drugId: m.drugId,
              dosage: m.dosage,
              duration: m.duration,
              instructions: m.instructions
            }))
          }, { headers: getAuthHeaders() })
        }
      }

      setMessage({ type: 'success', text: 'Treatment & prescription saved successfully!' })
      setDiagnosis('')
      setClinicalAdvice('')
      setTreatmentNotes('')
      setMedItems([])
      fetchAppointments()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save treatment.' })
    } finally { setSaving(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  // Stats
  const totalToday = appointments.length
  const pending = appointments.filter(a => a.STATUS === 'Scheduled').length
  const completed = appointments.filter(a => a.STATUS === 'Completed').length

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="doctor-layout">
      {/* Sidebar */}
      <aside className="doctor-sidebar">
        <div className="sidebar-brand">
          <h2><span className="brand-icon">✙</span> CarePulse</h2>
          <div className="brand-subtitle">Doctor Portal</div>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <span className="nav-icon">📋</span> Dashboard
          </button>
          <button className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
            <span className="nav-icon">📚</span> Patient History
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-nav-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="doctor-main">
        <header className="main-header">
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search patient (Name, ID, Phone)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="drug-dropdown" style={{ top: 'calc(100% + 4px)', left: 0, right: 0 }}>
                {searchResults.map(p => (
                  <div key={p.PATIENT_ID} className="drug-dropdown-item" onClick={() => selectSearchPatient(p)}>
                    <div className="drug-item-name">{p.NAME}</div>
                    <div className="drug-item-meta">ID: {p.PATIENT_ID} · {p.PHONE_NUMBER || 'No phone'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="header-right">
            <div className="doctor-profile">
              <div className="profile-avatar">{getInitials(user.name)}</div>
              <div className="profile-info">
                <div className="profile-name">{user.name || 'Doctor'}</div>
                <div className="profile-role">Doctor</div>
              </div>
            </div>
          </div>
        </header>

        <div className="main-content">
          {/* ─── DASHBOARD VIEW ──────────────────────── */}
          {view === 'dashboard' && (
            <>
              <div className="page-title-section">
                <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Dr. {(user.name || '').split(' ').pop()}</h1>
                <p>Here's your schedule for today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>

              {/* Stats */}
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon blue">👥</div>
                  <div className="stat-info">
                    <div className="stat-value">{totalToday}</div>
                    <div className="stat-label">Patients Today</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon amber">⏳</div>
                  <div className="stat-info">
                    <div className="stat-value">{pending}</div>
                    <div className="stat-label">Pending Consultations</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">✅</div>
                  <div className="stat-info">
                    <div className="stat-value">{completed}</div>
                    <div className="stat-label">Completed Exams</div>
                  </div>
                </div>
              </div>

              {/* Appointment Queue */}
              <div className="doc-card">
                <div className="doc-card-header">
                  <h3>📋 Today's Appointment Queue</h3>
                  <button className="start-exam-btn primary" onClick={fetchAppointments} style={{ fontSize: '12px', padding: '6px 14px' }}>
                    Refresh
                  </button>
                </div>
                <div className="doc-card-body">
                  {loading ? (
                    <div className="loading-container"><div className="spinner"></div><p>Loading queue...</p></div>
                  ) : appointments.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📭</div>
                      <p>No appointments scheduled for today.</p>
                    </div>
                  ) : (
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Time</th>
                          <th>Symptoms</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(appt => (
                          <tr key={appt.APPOINTMENT_ID} className={selectedAppt?.APPOINTMENT_ID === appt.APPOINTMENT_ID ? 'selected-row' : ''}>
                            <td>
                              <div className="patient-cell">
                                <div className={`patient-avatar ${(appt.GENDER || 'other').toLowerCase()}`}>
                                  {getInitials(appt.PATIENT_NAME)}
                                </div>
                                <div className="patient-details">
                                  <div className="p-name">{appt.PATIENT_NAME}</div>
                                  <div className="p-id">ID: #{appt.PATIENT_ID}{appt.GENDER ? ` · ${appt.GENDER}` : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td>{formatTime(appt.APPOINTMENT_DATE)}</td>
                            <td>{appt.SYMPTOMS || appt.DISEASE || '—'}</td>
                            <td>
                              <span className={`badge ${(appt.STATUS || '').toLowerCase().replace('-', '-')}`}>
                                <span className="badge-dot"></span>
                                {appt.STATUS}
                              </span>
                            </td>
                            <td>
                              <button
                                className="start-exam-btn primary"
                                onClick={() => selectPatient(appt)}
                                disabled={appt.STATUS === 'Completed'}
                              >
                                {appt.STATUS === 'Completed' ? 'Done' : 'Start Examination'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ─── EXAMINATION VIEW ────────────────────── */}
          {view === 'examination' && selectedPatient && (
            <>
              <div className="page-title-section">
                <h1>Patient: {selectedPatient.name}</h1>
                <p>Patient ID: #{selectedPatient.id}{selectedAppt ? ` · Appointment: ${formatDate(selectedAppt.APPOINTMENT_DATE)}` : ''}</p>
              </div>

              {/* Medical History */}
              <div className="viewer-panel" style={{ marginBottom: 24 }}>
                <div className="viewer-panel-header">
                  <h4>📄 Medical History</h4>
                </div>
                <div className="viewer-panel-body">
                  {history.length === 0 ? (
                    <div className="no-selection-msg">
                      <div className="msg-icon">📋</div>
                      <p>No previous medical records found.</p>
                    </div>
                  ) : (
                    history.map(r => (
                      <div key={r.RECORD_ID} className="record-item">
                        <div className="record-date">{formatDate(r.RECORD_DATE)}</div>
                        <div className="record-diagnosis">{r.DIAGNOSIS}</div>
                        <div className="record-notes">{r.TREATMENT_NOTES}</div>
                        {r.CLINICAL_ADVICE && <div className="record-notes" style={{ marginTop: 4, fontStyle: 'italic' }}>Advice: {r.CLINICAL_ADVICE}</div>}
                        <div className="record-doctor">Dr. {r.DOCTOR_NAME} — {r.SPECIALIST_AREA}</div>
                        {/* Show prescriptions for this record */}
                        {prescriptionHistory.filter(p => p.RECORD_ID === r.RECORD_ID).length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>PRESCRIBED:</div>
                            {prescriptionHistory.filter(p => p.RECORD_ID === r.RECORD_ID).map(p => (
                              <div key={p.ITEM_ID} style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>
                                💊 {p.DRUG_NAME} — {p.DOSAGE} · {p.DURATION}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Treatment & Advice Entry Form */}
              {selectedAppt && selectedAppt.STATUS !== 'Completed' && (
                <div className="doc-card treatment-section">
                  <div className="doc-card-header">
                    <h3>🩺 Treatment & Advice Entry</h3>
                  </div>
                  <div className="treatment-form">
                    {message.text && (
                      <div className={`alert alert-${message.type}`}>
                        {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="diagnosis">Diagnosis *</label>
                      <input
                        id="diagnosis"
                        type="text"
                        placeholder="Enter primary diagnosis..."
                        value={diagnosis}
                        onChange={e => setDiagnosis(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="treatmentNotes">Treatment Notes</label>
                      <input
                        id="treatmentNotes"
                        type="text"
                        placeholder="Active treatments, procedures performed..."
                        value={treatmentNotes}
                        onChange={e => setTreatmentNotes(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="clinicalAdvice">Clinical Advice & Instructions</label>
                      <textarea
                        id="clinicalAdvice"
                        placeholder="Dietary advice, follow-up instructions, lifestyle changes..."
                        value={clinicalAdvice}
                        onChange={e => setClinicalAdvice(e.target.value)}
                        rows={4}
                      />
                    </div>

                    {/* Prescription Builder */}
                    <div className="prescription-builder">
                      <div className="prescription-header">
                        <h4>💊 Prescription Builder</h4>
                        <button type="button" className="add-med-btn" onClick={addMedicine}>
                          + Add Medicine
                        </button>
                      </div>

                      {medItems.length === 0 ? (
                        <div className="no-meds-msg">No medicines added yet. Click "Add Medicine" to start building the prescription.</div>
                      ) : (
                        medItems.map((item, idx) => (
                          <div key={idx} className="med-row">
                            <div className="form-group">
                              <label>Drug</label>
                              <DrugSearchInput
                                value={item.drugId}
                                drugName={item.drugName}
                                onSelect={(drug) => selectDrug(idx, drug)}
                              />
                            </div>
                            <div className="form-group">
                              <label>Dosage</label>
                              <input
                                type="text"
                                placeholder="e.g. 500mg"
                                value={item.dosage}
                                onChange={e => updateMedItem(idx, 'dosage', e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label>Duration</label>
                              <input
                                type="text"
                                placeholder="e.g. 7 days"
                                value={item.duration}
                                onChange={e => updateMedItem(idx, 'duration', e.target.value)}
                              />
                            </div>
                            <button type="button" className="remove-med-btn" onClick={() => removeMedItem(idx)}>×</button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="form-actions">
                      <button className="save-btn primary" onClick={handleSaveTreatment} disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Treatment & Prescription'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Back button */}
              <div style={{ marginTop: 8 }}>
                <button
                  className="start-exam-btn primary"
                  onClick={() => { setView('dashboard'); setSelectedPatient(null); setSelectedAppt(null) }}
                  style={{ background: '#64748b' }}
                >
                  ← Back to Dashboard
                </button>
              </div>
            </>
          )}

          {/* ─── PATIENT HISTORY VIEW ─────────────────── */}
          {view === 'history' && (
            <>
              <div className="page-title-section">
                <h1>Patient Medical History</h1>
                <p>Search a patient above to review their previous treatment records, advice and prescribed medicines.</p>
              </div>

              {!selectedPatient ? (
                <div className="doc-card">
                  <div className="doc-card-body">
                    <div className="empty-state">
                      <div className="empty-icon">🔍</div>
                      <p>Use the search bar at the top to find a patient by name, ID or phone number.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="doc-card" style={{ marginBottom: 16 }}>
                    <div className="doc-card-body">
                      <div className="patient-cell">
                        <div className={`patient-avatar ${(selectedPatient.gender || 'other').toLowerCase()}`}>
                          {getInitials(selectedPatient.name)}
                        </div>
                        <div className="patient-details">
                          <div className="p-name">{selectedPatient.name}</div>
                          <div className="p-id">ID: #{selectedPatient.id}{selectedPatient.gender ? ` · ${selectedPatient.gender}` : ''}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="loading-container"><div className="spinner"></div><p>Loading patient records...</p></div>
                  ) : (
                    <div className="viewer-panel">
                      <div className="viewer-panel-header">
                        <h4>📄 Medical History — Treatment, Advice & Medicines</h4>
                      </div>
                      <div className="viewer-panel-body">
                        {history.length === 0 ? (
                          <div className="no-selection-msg">
                            <div className="msg-icon">📋</div>
                            <p>No previous medical records found.</p>
                          </div>
                        ) : (
                          history.map(r => (
                            <div key={r.RECORD_ID} className="record-item">
                              <div className="record-date">{formatDate(r.RECORD_DATE)}</div>
                              <div className="record-diagnosis">Diagnosis: {r.DIAGNOSIS}</div>
                              {r.TREATMENT_NOTES && (
                                <div className="record-notes" style={{ marginTop: 4 }}>
                                  <strong>Treatment:</strong> {r.TREATMENT_NOTES}
                                </div>
                              )}
                              {r.CLINICAL_ADVICE && (
                                <div className="record-notes" style={{ marginTop: 4, fontStyle: 'italic' }}>
                                  <strong>Advice:</strong> {r.CLINICAL_ADVICE}
                                </div>
                              )}
                              <div className="record-doctor">Dr. {r.DOCTOR_NAME} — {r.SPECIALIST_AREA}</div>
                              {/* Prescribed medicines for this record */}
                              {prescriptionHistory.filter(p => p.RECORD_ID === r.RECORD_ID).length > 0 && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>PRESCRIBED MEDICINES:</div>
                                  {prescriptionHistory.filter(p => p.RECORD_ID === r.RECORD_ID).map(p => (
                                    <div key={p.ITEM_ID} style={{ fontSize: 12, color: '#475569', marginBottom: 2 }}>
                                      💊 {p.DRUG_NAME} — {p.DOSAGE} · {p.DURATION}{p.INSTRUCTIONS ? ` · ${p.INSTRUCTIONS}` : ''}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}