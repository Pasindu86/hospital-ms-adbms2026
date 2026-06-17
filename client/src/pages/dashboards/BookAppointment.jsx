import { useState, useEffect } from 'react'
import axios from 'axios'
import './UserDashboard.css'
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

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${API_URL}/patient/doctors`, { headers })
      .then((r) => setDoctors(r.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.doctorId || !form.date) {
      setSlots([])
      setHours(null)
      setSlotMessage('')
      setForm((f) => ({ ...f, slot: '' }))
      return
    }

    setLoadingSlots(true)
    setSlotMessage('')
    axios.get(`${API_URL}/patient/doctors/${form.doctorId}/slots`, {
      headers,
      params: { date: form.date },
    })
      .then((r) => {
        setSlots(r.data.slots || [])
        setHours(r.data.hours)
        setSlotMessage(r.data.message || '')
        setForm((f) => ({ ...f, slot: '' }))
      })
      .catch(() => {
        setSlots([])
        setSlotMessage('Could not load time slots')
      })
      .finally(() => setLoadingSlots(false))
  }, [form.doctorId, form.date])

  const selectedDoctor = doctors.find((d) => String(d.doctorId) === String(form.doctorId))

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSlotSelect = (slot) => {
    setForm((f) => ({ ...f, slot }))
  }

  const minDate = new Date().toISOString().slice(0, 10)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.slot) {
      setMessage({ type: 'error', text: 'Please select a time slot' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const appointmentDate = `${form.date}T${form.slot}:00`
      await axios.post(`${API_URL}/patient/appointments`, {
        doctorId: form.doctorId,
        appointmentDate,
        notes: form.notes,
        paymentMethod: form.paymentMethod,
      }, { headers })

      setMessage({ type: 'success', text: 'Appointment booked successfully!' })
      setForm({ doctorId: '', date: '', slot: '', notes: '', paymentMethod: 'Cash' })
      setSlots([])
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Booking failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 8px' }}>Book New Appointment</h2>
      <p style={{ color: '#4a5568', margin: '0 0 24px' }}>
        Select a doctor, pick a date, then choose an available 15-minute slot.
      </p>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Doctor *</label>
            <select name="doctorId" value={form.doctorId} onChange={handleChange} required>
              <option value="">Select a doctor</option>
              {doctors.map((d) => (
                <option key={d.doctorId} value={d.doctorId}>
                  {d.name} — {d.specialty || 'General'}
                  {d.hoursSummary ? ` (${d.hoursSummary})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedDoctor && (
            <p className="doctor-hours-hint">
              Working hours vary by day. Pick a date to see available 15-min slots.
            </p>
          )}

          <div className="form-group">
            <label>Date *</label>
            <input
              name="date"
              type="date"
              value={form.date}
              min={minDate}
              onChange={handleChange}
              required
            />
          </div>

          {form.doctorId && form.date && (
            <div className="form-group">
              <label>Available Time Slots (15 min) *</label>
              {loadingSlots ? (
                <p className="slot-hint">Loading slots...</p>
              ) : slots.length > 0 ? (
                <>
                  {hours && (
                    <p className="slot-hint">
                      Doctor available {hours.start} – {hours.end} on this day
                    </p>
                  )}
                  <div className="slot-grid">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`slot-btn ${form.slot === slot ? 'selected' : ''}`}
                        onClick={() => handleSlotSelect(slot)}
                      >
                        {formatSlotDisplay(slot)}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="slot-hint slot-empty">
                  {slotMessage || 'No slots available for this date'}
                </p>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Payment Method</label>
            <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes / Symptoms</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Describe your symptoms or reason for visit..."
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !form.slot}>
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}

function formatSlotDisplay(slot) {
  const [h, m] = slot.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
