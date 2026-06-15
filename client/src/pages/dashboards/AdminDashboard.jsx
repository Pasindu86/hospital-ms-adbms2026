import React, { useState, useEffect } from 'react';
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
  {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="16" x2="22" y1="11" y2="11" /></svg>,
    color: 'green',
    title: 'New Staff Onboarded',
    desc: 'Sarah Jenkins • Cardiology',
    time: '2 HOURS AGO'
  },
  {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
    color: 'blue',
    title: 'Profile Updated',
    desc: 'Dr. Alan Turing • Neurology',
    time: '5 HOURS AGO'
  },
  {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>,
    color: 'red',
    title: 'License Expiry Warning',
    desc: 'Dr. Gregory House • Diagnostics',
    time: '1 DAY AGO'
  },
];

const stats = [
  {
    label: 'Total Doctors', value: '42', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /><path d="M12 5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" /><path d="M9 3v2" /><path d="M15 3v2" /><path d="M12 14v4" /><path d="M10 16h4" /></svg>
    ), color: 'blue', badge: '+4%', badgeColor: 'green'
  },
  {
    label: 'Total Patients', value: '1,240', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ), color: 'purple', badge: '+12%', badgeColor: 'green'
  },
  {
    label: 'Active Appointments', value: '85', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
    ), color: 'amber', badge: 'Busy', badgeColor: 'orange'
  },
  {
    label: 'Low Stock Alerts', value: '12', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
    ), color: 'red', badge: 'Critical', badgeColor: 'red'
  },
];

const navItems = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
    ), label: 'Dashboards'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ), label: 'Patients'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
    ), label: 'Appointments'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
    ), label: 'Staff', active: true
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
    ), label: 'Inventory'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>
    ), label: 'Reports'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
    ), label: 'Settings'
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [filterDept, setFilterDept] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [availableNurses, setAvailableNurses] = useState([]);
  const [formData, setFormData] = useState({ 
    staffId: '', fullName: '', email: '', password: '', role: 'doctor',
    mobileNumber: '', address: '', licenseNumber: '', specialistArea: '', nurses: []
  });

  useEffect(() => {
    const fetchNurses = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/nurses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAvailableNurses(res.data.nurses || []);
      } catch (err) {
        console.error('Failed to fetch nurses', err);
      }
    };
    fetchNurses();
  }, []);

  const handleNurseToggle = (nurseId) => {
    setFormData(prev => {
      const current = prev.nurses || [];
      if (current.includes(nurseId)) {
        return { ...prev, nurses: current.filter(id => id !== nurseId) };
      } else {
        return { ...prev, nurses: [...current, nurseId] };
      }
    });
  };

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
      let endpoint = `${API_URL}/auth/register`;
      if (formData.role === 'doctor') {
        endpoint = `${API_URL}/admin/register-doctor`;
      } else if (formData.role === 'nurse') {
        endpoint = `${API_URL}/admin/register-nurse`;
      }
        
      const res = await axios.post(endpoint, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ type: 'success', text: res.data.message || 'Staff registered successfully!' });
      setFormData({ 
        staffId: '', fullName: '', email: '', password: '', role: 'doctor',
        mobileNumber: '', address: '', licenseNumber: '', specialistArea: '', nurses: []
      });
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
          <div className="sidebar-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /></svg>
          </div>
          <div className="sidebar-brand-text">
            <h2>CarePulse</h2>
            <span>Enterprise HMS</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.label} className={`sidebar-nav-item ${item.active ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-bottom-item">
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
            </span>
            Help Center
          </button>
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
          <div className="topbar-search">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
            <input type="text" placeholder="Search staff, patients, records..." />
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              <span className="notif-dot"></span>
            </button>
            <div className="topbar-divider"></div>
            <div className="user-profile">
              <div className="topbar-avatar">AD</div>
              <div className="user-info">
                <span className="user-name">Admin User</span>
                <span className="user-role">Super Admin</span>
              </div>
            </div>
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
                  <button className="filter-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9v6l4 3v-9L22 3z" /></svg>
                  </button>
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
                    <input type="email" placeholder="name@carepulse.local" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
                  </div>
                </div>

                {(formData.role === 'doctor' || formData.role === 'nurse') && (
                  <>
                    <div className="modal-form-row">
                      <div className="form-field">
                        <label>Mobile Number</label>
                        <input type="text" placeholder="e.g. 0712345678" value={formData.mobileNumber} onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} required />
                      </div>
                      <div className="form-field">
                        <label>License Number</label>
                        <input type="text" placeholder="e.g. RN12345" value={formData.licenseNumber} onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} required />
                      </div>
                    </div>
                    
                    <div className="modal-form-row">
                      <div className="form-field">
                        <label>Address</label>
                        <input type="text" placeholder="e.g. 123 Main St" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
                      </div>
                      {formData.role === 'doctor' ? (
                        <div className="form-field">
                          <label>Specialist Area</label>
                          <input type="text" placeholder="e.g. Cardiology" value={formData.specialistArea} onChange={e => setFormData({ ...formData, specialistArea: e.target.value })} required />
                        </div>
                      ) : (
                        <div className="form-field">
                          <label>Allocated Ward</label>
                          <input type="text" placeholder="e.g. ICU" value={formData.allocatedWard || ''} onChange={e => setFormData({ ...formData, allocatedWard: e.target.value })} required />
                        </div>
                      )}
                    </div>

                    {formData.role === 'doctor' && (
                      <div className="form-field">
                        <label>Allocate Nurses</label>
                        <div className="nurse-select-list" style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                          {availableNurses.map(nurse => (
                            <label key={nurse.NURSE_ID} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                              <input 
                                type="checkbox" 
                                checked={(formData.nurses || []).includes(nurse.NURSE_ID)}
                                onChange={() => handleNurseToggle(nurse.NURSE_ID)}
                              />
                              {nurse.NAME} ({nurse.ALLOCATED_WARD})
                            </label>
                          ))}
                          {availableNurses.length === 0 && <span style={{ color: '#64748b' }}>No nurses available.</span>}
                        </div>
                      </div>
                    )}
                  </>
                )}

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
