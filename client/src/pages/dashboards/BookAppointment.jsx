import { useState, useEffect } from 'react'
import axios from 'axios'
import './UserDashboard.css'
import './BookAppointment.css'
import { API_URL } from '../../api'

export default function BookAppointment() {
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({
    doctorId: '', date: '', slot: '', notes: '', paymentMethod: 'Cash',
  })
  const [slots, setSlots] = useState([])
  const [hours, setHours] = useState(null)
  const [slotMessage, setSlotMessage] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [weeklyAvailability, setWeeklyAvailability] = useState([])
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [nextToken, setNextToken] = useState(null)
  const [bookedToken, setBookedToken] = useState(null)

  // Generate next 14 days
  const getTwoWeeksDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const d = new Date()
      d.setDate(today.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const twoWeeksDates = getTwoWeeksDates()
  const thisWeekDates = twoWeeksDates.slice(0, 7)
  const nextWeekDates = twoWeeksDates.slice(7, 14)

  const getIsoDay = (date) => {
    const jsDay = date.getDay()
    return jsDay === 0 ? 7 : jsDay
  }

  const getScheduleForDate = (date) => {
    const isoDay = getIsoDay(date)
    return weeklyAvailability.find((item) => Number(item.dayOfWeek) === isoDay)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    axios.get(`${API_URL}/patient/doctors`, { headers })
      .then((r) => setDoctors(r.data))
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!form.doctorId) {
      setWeeklyAvailability([])
      setNextToken(null)
      return
    }
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    setLoadingWeekly(true)
    axios.get(`${API_URL}/patient/doctors/${form.doctorId}/weekly-availability`, { headers })
      .then((r) => {
        setWeeklyAvailability(r.data || [])
      })
      .catch(() => {
        setWeeklyAvailability([])
      })
      .finally(() => setLoadingWeekly(false))
  }, [form.doctorId])

  useEffect(() => {
    if (!form.doctorId || !form.date) {
      return
    }

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    axios.get(`${API_URL}/patient/doctors/${form.doctorId}/slots`, {
      headers,
      params: { date: form.date },
    })
      .then((r) => {
        setSlots(r.data.slots || [])
        setHours(r.data.hours)
        setSlotMessage(r.data.message || '')
        setNextToken(r.data.nextToken || null)
        const start = r.data.hours?.start || '09:00'
        setForm((f) => ({ ...f, slot: start }))
      })
      .catch(() => {
        setSlots([])
        setSlotMessage('Could not load time slots')
        setNextToken(null)
      })
      .finally(() => setLoadingSlots(false))
  }, [form.doctorId, form.date])

  const selectedDoctor = doctors.find((d) => String(d.doctorId) === String(form.doctorId))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => {
      const nextForm = { ...f, [name]: value }
      if (name === 'doctorId' || name === 'date') {
        setSlots([])
        setHours(null)
        setSlotMessage('')
        setNextToken(null)
        nextForm.slot = ''
        nextForm.date = ''
        if (nextForm.doctorId && nextForm.date) {
          setLoadingSlots(true)
        }
      }
      return nextForm
    })
  }

  const handleSlotSelect = (slot) => {
    setForm((f) => ({ ...f, slot }))
  }

  const handleBookClick = (e) => {
    e.preventDefault()
    if (!form.doctorId || !form.date) {
      setMessage({ type: 'error', text: 'Please complete all required fields' })
      return
    }
    setShowConfirmModal(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false)
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const appointmentDate = `${form.date}T${form.slot}:00`
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await axios.post(`${API_URL}/patient/appointments`, {
        doctorId: form.doctorId,
        appointmentDate,
        notes: form.notes,
        paymentMethod: 'Cash',
      }, { headers })

      setBookedToken(res.data.tokenNumber)
      setForm({ doctorId: '', date: '', slot: '', notes: '', paymentMethod: 'Cash' })
      setSlots([])
      setNextToken(null)
      setMessage({ type: 'success', text: 'Appointment booked successfully!' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Booking failed' })
    } finally {
      setLoading(false)
    }
  }

  // Categorize slots
  const morningSlots = []
  const afternoonSlots = []
  const eveningSlots = []

  slots.forEach((slot) => {
    const [h] = slot.split(':').map(Number)
    if (h < 12) {
      morningSlots.push(slot)
    } else if (h < 17) {
      afternoonSlots.push(slot)
    } else {
      eveningSlots.push(slot)
    }
  })

  // Get availability badge status
  const getAvailabilityBadge = () => {
    if (slots.length === 0) {
      return <span className="badge-status badge-booked">Fully Booked</span>
    }
    if (slots.length < 5) {
      return <span className="badge-status badge-limited">Limited Slots</span>
    }
    return <span className="badge-status badge-available">Available Today</span>
  }

  const isFormValid = form.doctorId && form.date

  if (bookedToken) {
    return (
      <div className="booking-page-container">
        <div className="token-success-card">
          <div className="token-success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h3>Booking Confirmed!</h3>
          <p>Your appointment has been successfully scheduled.</p>
          <div className="token-number-box">
            <span className="token-number-label">YOUR TOKEN NUMBER</span>
            <span className="token-number-value">{bookedToken}</span>
          </div>
          <button className="btn-secondary" onClick={() => setBookedToken(null)}>Book Another Appointment</button>
        </div>
      </div>
    )
  }

  return (
    <div className="booking-page-container">
      <div className="booking-header">
        <h2>Book New Appointment</h2>
        <p>Select your provider, find a matching day, and finalize your scheduling details.</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {message.type === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="booking-grid">
        {/* Left Side: Booking Form */}
        <div className="booking-form-card">
          <form onSubmit={handleBookClick}>
            {/* Doctor Select */}
            <div className="form-group">
              <label className="form-label-with-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Doctor *
              </label>
              <select name="doctorId" value={form.doctorId} onChange={handleChange} required>
                <option value="">Select a doctor</option>
                {doctors.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.name} — {d.specialty || 'General Specialist'}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor's Weekly Availability Display */}
            {form.doctorId && (
              <div className="weekly-availability-container">
                <div className="weekly-availability-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Doctor's Weekly Availability</span>
                </div>
                {loadingWeekly ? (
                  <div style={{ textAlign: 'center', padding: '10px', color: '#8c9ba5' }}>Loading schedule...</div>
                ) : (
                  <div className="weekly-days-grid">
                    {[
                      { id: 1, name: 'MON' },
                      { id: 2, name: 'TUE' },
                      { id: 3, name: 'WED' },
                      { id: 4, name: 'THU' },
                      { id: 5, name: 'FRI' },
                      { id: 6, name: 'SAT' },
                      { id: 7, name: 'SUN' }
                    ].map((day) => {
                      const sched = weeklyAvailability.find((item) => Number(item.dayOfWeek) === day.id)
                      return (
                        <div key={day.id} className={`weekly-day-card ${sched ? 'active' : ''}`}>
                          <div className="weekly-day-name">{day.name}</div>
                          <div className="weekly-day-hours">
                            {sched ? `${sched.startTime}-${sched.endTime}` : 'Off'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2-Week Calendar Picker */}
            {form.doctorId && (
              <div className="form-group" style={{ marginTop: '24px' }}>
                <label className="form-label-with-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Select Date *
                </label>

                <div className="calendar-section">
                  <div className="calendar-group-label">This Week</div>
                  <div className="calendar-grid">
                    {thisWeekDates.map((date) => {
                      const sched = getScheduleForDate(date)
                      const isAvailable = !!sched
                      const dateStr = date.toISOString().slice(0, 10)
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          className={`calendar-date-btn ${form.date === dateStr ? 'selected' : ''}`}
                          disabled={!isAvailable}
                          onClick={() => {
                            setForm((f) => ({ ...f, date: dateStr, slot: '' }))
                            setSlots([])
                            setNextToken(null)
                            setLoadingSlots(true)
                          }}
                        >
                          <span className="calendar-date-day">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          <span className="calendar-date-val">{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="calendar-group-label">Next Week</div>
                  <div className="calendar-grid">
                    {nextWeekDates.map((date) => {
                      const sched = getScheduleForDate(date)
                      const isAvailable = !!sched
                      const dateStr = date.toISOString().slice(0, 10)
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          className={`calendar-date-btn ${form.date === dateStr ? 'selected' : ''}`}
                          disabled={!isAvailable}
                          onClick={() => {
                            setForm((f) => ({ ...f, date: dateStr, slot: '' }))
                            setSlots([])
                            setNextToken(null)
                            setLoadingSlots(true)
                          }}
                        >
                          <span className="calendar-date-day">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          <span className="calendar-date-val">{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Token Banner Preview */}
            {form.date && nextToken && (
              <div style={{ marginTop: '16px' }}>
                <div className="token-banner-info">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Estimated Start Time: <strong>{formatSlotDisplay(form.slot || '09:00')}</strong> (next Token #{nextToken})</span>
                </div>
                <div className="alert alert-success" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <span>Booking {new Date(form.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.</span>
                </div>
                <div className="token-number-box" style={{ margin: '16px 0 0 0', padding: '12px' }}>
                  <span className="token-number-label">YOUR ESTIMATED TOKEN NUMBER</span>
                  <span className="token-number-value" style={{ fontSize: '32px' }}>{nextToken}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label className="form-label-with-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Notes / Symptoms (Optional)
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Describe symptoms, complaints or special requests here..."
              />
            </div>
          </form>
        </div>

        {/* Right Side: Live Summary & Action Card */}
        <div className="summary-card">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Booking Summary
          </h3>
          <div className="summary-details">
            <div className="summary-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <div className="summary-row-content">
                <span className="summary-row-label">Doctor</span>
                <span className={`summary-row-value ${!selectedDoctor ? 'placeholder' : ''}`}>
                  {selectedDoctor ? selectedDoctor.name : 'Select a doctor'}
                </span>
              </div>
            </div>

            <div className="summary-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              <div className="summary-row-content">
                <span className="summary-row-label">Specialty</span>
                <span className={`summary-row-value ${!selectedDoctor ? 'placeholder' : ''}`}>
                  {selectedDoctor ? (selectedDoctor.specialty || 'General Practitioner') : 'Select a doctor'}
                </span>
              </div>
            </div>

            <div className="summary-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <div className="summary-row-content">
                <span className="summary-row-label">Selected Date</span>
                <span className={`summary-row-value ${!form.date ? 'placeholder' : ''}`}>
                  {form.date ? new Date(form.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select a date'}
                </span>
              </div>
            </div>

            {selectedDoctor && (
              <div className="payment-summary-block" style={{ marginTop: '20px', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '11px', color: '#6b7c93', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Payment Details</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>Doctor Fee</span>
                  <strong>Rs. {selectedDoctor.doctorFee || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>Hospital Fee</span>
                  <strong>Rs. {selectedDoctor.hospitalFee || 500}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginTop: '10px', color: '#1e5eff' }}>
                  <span>Total</span>
                  <span>Rs. {(selectedDoctor.doctorFee || 0) + (selectedDoctor.hospitalFee || 500)}</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-primary booking-submit-btn"
            onClick={handleBookClick}
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Confirm Scheduling
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal-card">
            <div className="confirm-modal-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <h4>Confirm Appointment</h4>
            </div>
            <div className="confirm-modal-body">
              <p>Please review your booking details before proceeding. This will reserve your chosen slot with the medical practitioner.</p>

              <div className="confirm-summary-list">
                <div className="confirm-summary-item">
                  <span className="confirm-summary-label">Doctor</span>
                  <span className="confirm-summary-value">{selectedDoctor?.name}</span>
                </div>
                <div className="confirm-summary-item">
                  <span className="confirm-summary-label">Specialization</span>
                  <span className="confirm-summary-value">{selectedDoctor?.specialty || 'General Specialist'}</span>
                </div>
                <div className="confirm-summary-item">
                  <span className="confirm-summary-label">Scheduled Date</span>
                  <span className="confirm-summary-value">
                    {form.date ? new Date(form.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
                <div className="confirm-summary-item">
                  <span className="confirm-summary-label">Doctor Fee</span>
                  <span className="confirm-summary-value">Rs. {selectedDoctor?.doctorFee || 0}</span>
                </div>
                <div className="confirm-summary-item">
                  <span className="confirm-summary-label">Hospital Fee</span>
                  <span className="confirm-summary-value">Rs. {selectedDoctor?.hospitalFee || 500}</span>
                </div>
                <div className="confirm-summary-item" style={{ fontWeight: 'bold', color: '#1e5eff' }}>
                  <span className="confirm-summary-label">Total Amount</span>
                  <span className="confirm-summary-value">Rs. {(selectedDoctor?.doctorFee || 0) + (selectedDoctor?.hospitalFee || 500)}</span>
                </div>
                {form.notes && (
                  <div className="confirm-summary-item">
                    <span className="confirm-summary-label">Symptoms Note</span>
                    <span className="confirm-summary-value" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.notes}</span>
                  </div>
                )}
              </div>

              <div className="confirm-modal-actions">
                <button type="button" className="confirm-btn-cancel" onClick={() => setShowConfirmModal(false)}>
                  Go Back
                </button>
                <button type="button" className="confirm-btn-proceed" onClick={handleConfirmSubmit}>
                  Confirm & Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatSlotDisplay(slot) {
  const [h, m] = slot.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}