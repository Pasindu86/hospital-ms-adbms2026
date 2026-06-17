import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './DoctorDashboard.css'
import './AdminDashboard.css'

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

  // Build a printable patient report (treatment, advice, prescribed drugs) → save as PDF
  const downloadPatientReport = () => {
    if (!selectedPatient) return

    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const recordsHtml = history.length === 0
      ? '<p class="empty">No medical records found for this patient.</p>'
      : history.map(r => {
          const meds = prescriptionHistory.filter(p => p.RECORD_ID === r.RECORD_ID)
          const medsHtml = meds.length === 0
            ? '<p class="none">No medicines prescribed.</p>'
            : `<table class="meds">
                 <thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th><th>Instructions</th></tr></thead>
                 <tbody>
                   ${meds.map(m => `<tr>
                       <td>${esc(m.DRUG_NAME)}</td>
                       <td>${esc(m.DOSAGE)}</td>
                       <td>${esc(m.DURATION)}</td>
                       <td>${esc(m.INSTRUCTIONS) || '—'}</td>
                     </tr>`).join('')}
                 </tbody>
               </table>`
          return `
            <div class="record">
              <div class="record-head">
                <span class="record-date">${esc(formatDate(r.RECORD_DATE))}</span>
                <span class="record-doc">Dr. ${esc(r.DOCTOR_NAME)}${r.SPECIALIST_AREA ? ' — ' + esc(r.SPECIALIST_AREA) : ''}</span>
              </div>
              <p><strong>Diagnosis:</strong> ${esc(r.DIAGNOSIS) || '—'}</p>
              ${r.TREATMENT_NOTES ? `<p><strong>Treatment:</strong> ${esc(r.TREATMENT_NOTES)}</p>` : ''}
              ${r.CLINICAL_ADVICE ? `<p><strong>Clinical Advice:</strong> ${esc(r.CLINICAL_ADVICE)}</p>` : ''}
              <div class="meds-label">Prescribed Medicines</div>
              ${medsHtml}
            </div>`
        }).join('')

    const html = `
      <html>
        <head>
          <title>Patient Report - ${esc(selectedPatient.name)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 32px; }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #1d4ed8; font-size: 22px; }
            .header p { margin: 2px 0 0; color: #64748b; font-size: 13px; }
            .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
            .patient-box .row { display: flex; justify-content: space-between; font-size: 14px; margin: 3px 0; }
            .patient-box .label { color: #64748b; }
            h2.section { font-size: 15px; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 10px; margin: 0 0 14px; }
            .record { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; page-break-inside: avoid; }
            .record-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .record-date { font-weight: 700; color: #1d4ed8; }
            .record-doc { color: #64748b; font-size: 13px; }
            .record p { margin: 4px 0; font-size: 13.5px; }
            .meds-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 10px 0 6px; }
            table.meds { width: 100%; border-collapse: collapse; font-size: 12.5px; }
            table.meds th, table.meds td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
            table.meds th { background: #f1f5f9; color: #475569; }
            .none, .empty { color: #94a3b8; font-style: italic; font-size: 13px; }
            .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; color: #94a3b8; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CarePulse Hospital</h1>
            <p>Patient Medical Report</p>
          </div>

          <div class="patient-box">
            <div class="row"><span class="label">Patient Name</span><strong>${esc(selectedPatient.name)}</strong></div>
            <div class="row"><span class="label">Patient ID</span><span>#${esc(selectedPatient.id)}</span></div>
            <div class="row"><span class="label">Gender</span><span>${esc(selectedPatient.gender) || '—'}</span></div>
            <div class="row"><span class="label">Report Generated</span><span>${new Date().toLocaleString()}</span></div>
            <div class="row"><span class="label">Attending Doctor</span><span>Dr. ${esc(user.name) || '—'}</span></div>
          </div>

          <h2 class="section">Treatment History, Advice &amp; Prescriptions</h2>
          ${recordsHtml}

          <div class="footer">
            This is a system-generated medical report from CarePulse Hospital Management System.
          </div>
          <script>
            window.onload = function () { window.print(); }
          </script>
        </body>
      </html>`

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  // Stats
  const totalToday = appointments.length
  const pending = appointments.filter(a => a.STATUS === 'Scheduled').length
  const completed = appointments.filter(a => a.STATUS === 'Completed').length

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /></svg>
          </div>
          <div className="sidebar-brand-text">
            <h2>CarePulse</h2>
            <span>Doctor Portal</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
            </span>
            <span className="nav-label">Dashboard</span>
          </button>
          <button className={`sidebar-nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </span>
            <span className="nav-label">Patient History</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-bottom-item logout" onClick={handleLogout}>
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-search" style={{ position: 'relative' }}>
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
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
          <div className="topbar-right">
            <div className="user-profile">
              <div className="topbar-avatar">{getInitials(user.name)}</div>
              <div className="user-info">
                <span className="user-name">{user.name || 'Doctor'}</span>
                <span className="user-role">Doctor</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          {/* ─── DASHBOARD VIEW ──────────────────────── */}
          {view === 'dashboard' && (
            <>
              <div className="page-title-row">
                <div className="page-title">
                  <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Dr. {(user.name || '').split(' ').pop()}</h1>
                  <p>Here's your schedule for today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="stat-cards">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-label">Patients Today</div>
                    <div className="stat-value">{totalToday}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon amber">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-label">Pending Consultations</div>
                    <div className="stat-value">{pending}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  <div className="stat-info">
                    <div className="stat-label">Completed Exams</div>
                    <div className="stat-value">{completed}</div>
                  </div>
                </div>
              </div>

              {/* Appointment Queue */}
              <div className="table-card">
                <div className="table-card-header">
                  <h2>Today's Appointment Queue</h2>
                  <button className="start-exam-btn primary" onClick={fetchAppointments} style={{ fontSize: '12px', padding: '6px 14px' }}>
                    Refresh
                  </button>
                </div>
                <div className="table-card-body" style={{ padding: 0 }}>
                  {loading ? (
                    <div className="loading-container"><div className="spinner"></div><p>Loading queue...</p></div>
                  ) : appointments.length === 0 ? (
                    <div className="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', color: '#94a3b8', display: 'block' }}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                      <p>No appointments scheduled for today.</p>
                    </div>
                  ) : (
                    <table className="staff-table">
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
              <div className="page-title-row">
                <div className="page-title">
                  <h1>Patient: {selectedPatient.name}</h1>
                  <p>Patient ID: #{selectedPatient.id}{selectedAppt ? ` · Appointment: ${formatDate(selectedAppt.APPOINTMENT_DATE)}` : ''}</p>
                </div>
                <button className="start-exam-btn primary" onClick={downloadPatientReport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                  Download PDF Report
                </button>
              </div>

              {/* Medical History */}
              <div className="table-card" style={{ marginBottom: 24 }}>
                <div className="table-card-header">
                  <h2>Medical History</h2>
                </div>
                <div className="viewer-panel-body">
                  {history.length === 0 ? (
                    <div className="no-selection-msg">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', color: '#cbd5e1', display: 'block' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
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
                              <div key={p.ITEM_ID} style={{ fontSize: 12, color: '#475569', marginBottom: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.5 20.5 4 14l6.5-6.5a4.95 4.95 0 1 1 7 7Z"/><path d="m14 10.5 6.5-6.5a4.95 4.95 0 1 0-7-7Z"/></svg>
                                {p.DRUG_NAME} — {p.DOSAGE} · {p.DURATION}
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
                <div className="table-card treatment-section">
                  <div className="table-card-header">
                    <h2>Treatment & Advice Entry</h2>
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
                        <h2 style={{ fontSize: '16px', margin: 0, color: '#0f172a' }}>Prescription Builder</h2>
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
                        {saving ? 'Saving...' : 'Save Treatment & Prescription'}
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
              <div className="page-title-row">
                <div className="page-title">
                  <h1>Patient Medical History</h1>
                  <p>Search a patient above to review their previous treatment records, advice and prescribed medicines.</p>
                </div>
                {selectedPatient && (
                  <button className="start-exam-btn primary" onClick={downloadPatientReport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    Download PDF Report
                  </button>
                )}
              </div>

              {!selectedPatient ? (
                <div className="table-card">
                  <div className="table-card-body" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div className="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', color: '#94a3b8', display: 'block' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      <p style={{ color: '#94a3b8' }}>Use the search bar at the top to find a patient by name, ID or phone number.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-card" style={{ marginBottom: 16 }}>
                    <div className="table-card-body" style={{ padding: '16px 20px' }}>
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
                    <div className="table-card">
                      <div className="table-card-header">
                        <h2>Medical History — Treatment, Advice & Medicines</h2>
                      </div>
                      <div className="viewer-panel-body">
                        {history.length === 0 ? (
                          <div className="no-selection-msg">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', color: '#cbd5e1', display: 'block' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
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
                                    <div key={p.ITEM_ID} style={{ fontSize: 12, color: '#475569', marginBottom: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.5 20.5 4 14l6.5-6.5a4.95 4.95 0 1 1 7 7Z"/><path d="m14 10.5 6.5-6.5a4.95 4.95 0 1 0-7-7Z"/></svg>
                                      {p.DRUG_NAME} — {p.DOSAGE} · {p.DURATION}{p.INSTRUCTIONS ? ` · ${p.INSTRUCTIONS}` : ''}
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
        </main>
      </div>
    </div>
  )
}