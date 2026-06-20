import { useState, useEffect } from 'react'
import axios from 'axios'
import './UserDashboard.css'
import { API_URL } from '../../api'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-LK', {
    dateStyle: 'medium', timeStyle: 'short',
  })
}

function statusClass(status) {
  const map = { Scheduled: 'status-scheduled', Completed: 'status-completed', Cancelled: 'status-cancelled' }
  return map[status] || 'status-scheduled'
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ doctorId: '', appointmentDate: '', notes: '', paymentMethod: 'Cash' })
  const [actionLoading, setActionLoading] = useState(false)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [apptRes, docRes] = await Promise.all([
        axios.get(`${API_URL}/patient/appointments`, { headers }),
        axios.get(`${API_URL}/patient/doctors`, { headers }),
      ])
      setAppointments(apptRes.data)
      setDoctors(docRes.data)
    } catch {
      setMessage({ type: 'error', text: 'Failed to load appointments' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    setActionLoading(true)
    try {
      await axios.delete(`${API_URL}/patient/appointments/${id}`, { headers })
      setMessage({ type: 'success', text: 'Appointment cancelled' })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Cancel failed' })
    } finally {
      setActionLoading(false)
    }
  }

  const openEdit = (appt) => {
    if (!appt.canEdit) {
      setMessage({ type: 'warning', text: 'Editing is only allowed when the appointment is more than 12 hours away.' })
      return
    }
    const dt = appt.appointmentDate?.replace(' ', 'T').substring(0, 16)
    setEditForm({
      doctorId: String(appt.doctorId),
      appointmentDate: dt || '',
      notes: appt.notes || '',
      paymentMethod: appt.paymentMethod || 'Cash',
    })
    setEditing(appt)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await axios.put(`${API_URL}/patient/appointments/${editing.appointmentId}`, editForm, { headers })
      setMessage({ type: 'success', text: 'Appointment updated successfully' })
      setEditing(null)
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Update failed' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 8px' }}>My Appointments</h2>
      <p style={{ color: '#4a5568', margin: '0 0 16px' }}>View and manage your scheduled visits.</p>

      <div className="rule-notice">
        Editing is allowed only when your appointment is <strong>more than 12 hours away</strong>.
        Cancelled and completed appointments cannot be edited.
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {loading ? (
        <p>Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <div className="card"><p>No appointments yet. Book your first visit!</p></div>
      ) : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.appointmentId}>
                  <td>{a.doctorName}</td>
                  <td>{a.specialty || '—'}</td>
                  <td>{formatDate(a.appointmentDate)}</td>
                  <td><span className={`status-badge ${statusClass(a.status)}`}>{a.status}</span></td>
                  <td>{a.paymentMethod} ({a.paymentStatus})</td>
                  <td>
                    {a.status === 'Scheduled' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => openEdit(a)}
                          disabled={!a.canEdit || actionLoading}
                          title={!a.canEdit ? 'Cannot edit — less than 12 hours away' : 'Edit appointment'}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleCancel(a.appointmentId)}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="edit-form-overlay" onClick={() => setEditing(null)}>
          <div className="edit-form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Appointment</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Doctor</label>
                <select
                  value={editForm.doctorId}
                  onChange={(e) => setEditForm({ ...editForm, doctorId: e.target.value })}
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.name} — {d.specialty || 'General'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date & Time</label>
                <input
                  type="datetime-local"
                  value={editForm.appointmentDate}
                  onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={editForm.paymentMethod}
                  onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                >
                  <option value="Cash">Cash</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
