import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    staffId: '',
    fullName: '',
    email: '',
    password: '',
    role: 'doctor'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await axios.post(`${API_URL}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ type: 'success', text: res.data.message || 'User registered successfully!' });
      setFormData({ staffId: '', fullName: '', email: '', password: '', role: 'doctor' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to register user.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="logo-icon">✙</span>
          <h2>CarePulse Admin</h2>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <main className="dashboard-content">
        <div className="page-header">
          <h1>User Management</h1>
          <p>Register new staff members and patients into the system.</p>
        </div>

        <section className="form-card">
          <div className="card-header">
            <h3>Add New User</h3>
            <span className="badge">Secured (Bcrypt Hashed)</span>
          </div>
          
          <form onSubmit={handleSubmit} className="register-form">
            {message.text && (
              <div className={`alert alert-${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="staffId">User ID (Staff ID or Patient ID)</label>
                <input 
                  type="text" 
                  id="staffId" 
                  name="staffId" 
                  placeholder="e.g. 0012 or P001" 
                  value={formData.staffId} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <div className="select-wrapper">
                  <select id="role" name="role" value={formData.role} onChange={handleChange} required>
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="reception">Receptionist</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="patient">Patient</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input 
                type="text" 
                id="fullName" 
                name="fullName" 
                placeholder="e.g. Dr. John Smith" 
                value={formData.fullName} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="name@carepulse.local" 
                  value={formData.email} 
                  onChange={handleChange} 
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  minLength="6"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Registering...' : 'Register User'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
