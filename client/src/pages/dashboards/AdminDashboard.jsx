import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = 'http://localhost:5000/api';

const staffData = [
  { id: 1, initials: 'JD', name: 'Dr. James Doe', role: 'Senior Surgeon', dept: 'General Surgery', status: 'active', avColor: 'av-blue' },
  { id: 2, initials: 'MS', name: 'Maria Smith', role: 'Head Nurse', dept: 'Cardiology', status: 'active', avColor: 'av-green' },
  { id: 3, initials: 'RK', name: 'Robert King', role: 'Pharmacist', dept: 'Main Pharmacy', status: 'deactivated', avColor: 'av-purple' },
  { id: 4, initials: 'LW', name: 'Linda White', role: 'Receptionist', dept: 'Front Desk', status: 'active', avColor: 'av-amber' },
];

const deptLoad = [
  { name: 'Cardiology', pct: 28, color: 'blue' },
  { name: 'Emergency', pct: 45, color: 'red' },
  { name: 'Pediatrics', pct: 15, color: 'indigo' },
];

const recentActions = [
  { icon: '⊕', color: 'green', title: 'New Nurse Onboarded', desc: 'Sarah Jenkins • Cardiology', time: '2 HOURS AGO' },
  { icon: '✎', color: 'blue', title: 'Profile Updated', desc: 'Dr. Alan Turing • Neurology', time: '5 HOURS AGO' },
  { icon: '⚠', color: 'red', title: 'License Expiry Warning', desc: 'Dr. Gregory House • Diagnostics', time: '1 DAY AGO' },
];

const navItems = [
  { icon: '⊞', label: 'Dashboards' },
  { icon: '👥', label: 'Patients' },
  { icon: '📅', label: 'Appointments' },
  { icon: '🧑‍⚕️', label: 'Staff', active: true },
  { icon: '📦', label: 'Inventory' },
  { icon: '📊', label: 'Reports' },
  { icon: '⚙', label: 'Settings' },
];

const stats = [
  { label: 'Total Doctors', value: '42', icon: '🩺', color: 'blue', badge: '+4%', badgeColor: 'green' },
  { label: 'Total Patients', value: '1,240', icon: '👤', color: 'purple', badge: '+12%', badgeColor: 'green' },
  { label: 'Active Appointments', value: '85', icon: '📋', color: 'amber', badge: 'Busy', badgeColor: 'orange' },
  { label: 'Low Stock Alerts', value: '12', icon: '🔔', color: 'red', badge: 'Critical', badgeColor: 'red' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [filterDept, setFilterDept] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({ staffId: '', fullName: '', email: '', password: '', role: 'doctor' });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post(`${API_URL}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ type: 'success', text: res.data.message || 'Staff registered successfully!' });
      setFormData({ staffId: '', fullName: '', email: '', password: '', role: 'doctor' });
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = filterDept === 'all'
    ? staffData
    : staffData.filter(s => s.dept.toLowerCase().includes(filterDept.toLowerCase()));

  return (
    <div className="admin-layout">
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
          {navItems.map(item => (
            <button key={item.label} className={`sidebar-nav-item ${item.active ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-bottom-item"><span className="nav-icon">❓</span>Help Center</button>
          <button className="sidebar-bottom-item logout" onClick={handleLogout}><span className="nav-icon">↪</span>Logout</button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search for staff, patients, or records..." />
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn">🔔<span className="notif-dot"></span></button>
            <button className="topbar-icon-btn">⊞</button>
            <div className="topbar-avatar">AD</div>
          </div>
        </header>

        <main className="page-content">
          <div className="page-title-row">
            <div className="page-title">
              <h1>Staff Management</h1>
              <p>Oversee hospital personnel and administration roles.</p>
            </div>
            <button className="btn-primary-add" onClick={() => { setShowModal(true); setMessage({ type: '', text: '' }); }}>
              ＋ Add New Staff Member
            </button>
          </div>

          {/* Stats Grid */}
          <div className="stat-cards">
            {stats.map((card, idx) => (
              <div className="stat-card" key={idx}>
                <div className={`stat-icon ${card.color}`}>{card.icon}</div>
                <div className="stat-info">
                  <div className="stat-label">{card.label}</div>
                  <div className="stat-value">{card.value}</div>
                </div>
                <span className={`stat-badge ${card.badgeColor}`}>{card.badge}</span>
              </div>
            ))}
          </div>

          <div className="content-grid">
            {/* Table Panel */}
            <div className="table-card">
              <div className="table-card-header">
                <h2>Staff Overview</h2>
                <div className="table-card-controls">
                  <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                    <option value="all">All Departments</option>
                    <option value="general">General Surgery</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="pharmacy">Main Pharmacy</option>
                    <option value="front">Front Desk</option>
                  </select>
                  <button className="filter-btn">⊟</button>
                </div>
              </div>

              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Name &amp; Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="staff-user">
                          <div className={`staff-avatar ${s.avColor}`}>{s.initials}</div>
                          <div>
                            <div className="staff-name">{s.name}</div>
                            <div className="staff-role">{s.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>{s.dept}</td>
                      <td><span className={`status-badge ${s.status}`}>{s.status.toUpperCase()}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="action-link edit">Edit</button>
                          <button className={`action-link ${s.status === 'active' ? 'deactivate' : 'activate'}`}>
                            {s.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="table-footer">
                <span>Showing {filteredStaff.length} of 240 staff members</span>
                <div className="pagination-btns">
                  <button className="page-btn">‹</button>
                  <button className="page-btn">›</button>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="right-sidebar">
              <div className="side-card">
                <div className="side-card-header">Department Load</div>
                <div className="side-card-body">
                  {deptLoad.map(d => (
                    <div className="dept-load-item" key={d.name}>
                      <div className="dept-load-top">
                        <span className="dept-load-name">{d.name}</span>
                        <span className="dept-load-pct">{d.pct}%</span>
                      </div>
                      <div className="dept-load-bar">
                        <div className={`dept-load-fill ${d.color}`} style={{ width: `${d.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="side-card">
                <div className="side-card-header">Recent Staff Actions</div>
                <div className="side-card-body">
                  {recentActions.map((a, i) => (
                    <div className="action-item" key={i}>
                      <div className={`action-dot ${a.color}`}>{a.icon}</div>
                      <div className="action-text">
                        <strong>{a.title}</strong>
                        <span className="action-desc">{a.desc}</span>
                        <span>{a.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="view-all-link">View All Logs</button>
              </div>
            </div>
          </div>
        </main>

        <footer className="admin-footer">
          <span>© 2024 CarePulse Health Systems. Confidential Admin Access Only.</span>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#health">System Health</a>
          </div>
        </footer>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Staff Member</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form className="modal-form" onSubmit={handleSubmit}>
                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                <div className="modal-form-row">
                  <div className="form-field">
                    <label>Staff ID</label>
                    <input type="text" placeholder="e.g. 0012" value={formData.staffId} onChange={e => setFormData({ ...formData, staffId: e.target.value })} required />
                  </div>
                  <div className="form-field">
                    <label>Role</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} required>
                      {[
                        { val: 'admin', label: 'Admin' },
                        { val: 'doctor', label: 'Doctor' },
                        { val: 'nurse', label: 'Nurse' },
                        { val: 'reception', label: 'Receptionist' },
                        { val: 'pharmacist', label: 'Pharmacist' },
                        { val: 'patient', label: 'Patient' }
                      ].map(r => (
                        <option key={r.val} value={r.val}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Dr. John Smith" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
                </div>

                <div className="modal-form-row">
                  <div className="form-field">
                    <label>Email Address</label>
                    <input type="email" placeholder="name@carepulse.local" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
                  </div>
                </div>

                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: '8px' }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Registering...' : 'Register Staff'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
