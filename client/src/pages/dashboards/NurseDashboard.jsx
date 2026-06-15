import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NurseDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nurseData, setNurseData] = useState(null);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [nurseRes, patientsRes] = await Promise.all([
        axios.get(`${API_URL}/nurse/me`, { headers }),
        axios.get(`${API_URL}/nurse/ward/patients`, { headers })
      ]);

      setNurseData(nurseRes.data);
      setPatients(patientsRes.data.patients);
    } catch (err) {
      console.error('Error fetching nurse data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return (
    <div className="nurse-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="loader">Loading Dashboard...</div>
    </div>
  );

  const profile = nurseData?.profile || {};
  const allocations = nurseData?.allocations || [];
  const primaryDoctor = allocations.length > 0 ? allocations[0] : null;

  return (
    <div className="nurse-layout">
      {/* Sidebar */}
      <aside className="nurse-sidebar">
        <div className="nurse-sidebar-brand">
          <div className="nurse-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /></svg>
          </div>
          <div className="sidebar-brand-text">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>CarePulse</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nurse Portal</span>
          </div>
        </div>
        <nav className="nurse-sidebar-nav">
          <button className="nurse-nav-item active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
            Dashboard
          </button>
          <button className="nurse-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            Patient Care
          </button>
          <button className="nurse-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
            Ward Info
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="nurse-main-area">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>Welcome back, {profile.NAME || 'Nurse'}</h1>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Here is what's happening in your ward today.</p>
          </div>
          <div className="nurse-nurse-info">
            <div className="nurse-avatar-circle">{profile.NAME ? profile.NAME.substring(0, 2).toUpperCase() : 'N'}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{profile.NAME}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{profile.LICENSE_NUMBER}</div>
            </div>
          </div>
        </header>

        {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '12px', border: '1px solid #fee2e2' }}>{error}</div>}

        {/* Stats Grid */}
        <div className="nurse-stats-grid">
          <div className="nurse-stat-card">
            <div className="nurse-stat-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" /><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" /><path d="M10 9V5h4v4" /></svg>
            </div>
            <div className="nurse-stat-info">
              <span className="nurse-stat-label">Assigned Ward</span>
              <span className="nurse-stat-value">{profile.ALLOCATED_WARD || 'Not Assigned'}</span>
            </div>
          </div>

          <div className="nurse-stat-card">
            <div className="nurse-stat-icon purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /></svg>
            </div>
            <div className="nurse-stat-info">
              <span className="nurse-stat-label">Allocated Doctor</span>
              <span className="nurse-stat-value">{primaryDoctor?.NAME || 'None'}</span>
            </div>
          </div>

          <div className="nurse-stat-card">
            <div className="nurse-stat-icon amber">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            </div>
            <div className="nurse-stat-info">
              <span className="nurse-stat-label">Current Shift</span>
              <span className="nurse-stat-value">{primaryDoctor?.SHIFT_DETAILS || 'General'}</span>
            </div>
          </div>
        </div>

        <div className="nurse-content-grid">
          {/* Patients in Ward */}
          <div className="nurse-panel">
            <div className="nurse-panel-header">
              <h2>Patients in {profile.ALLOCATED_WARD || 'Ward'}</h2>
              <button style={{ color: 'var(--nurse-primary)', background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer' }}>View All</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="nurse-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>ID</th>
                    <th>Diagnosis</th>
                    <th>Contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length > 0 ? patients.map(p => (
                    <tr key={p.PATIENT_ID}>
                      <td style={{ fontWeight: 600 }}>{p.NAME}</td>
                      <td style={{ color: '#64748b' }}>#{p.PATIENT_ID}</td>
                      <td>{p.DISEASE}</td>
                      <td>{p.PHONE_NUMBER}</td>
                      <td><span className="badge-ward">Stable</span></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No patients found for this ward.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dr. Allocation List */}
          <div className="nurse-panel">
            <div className="nurse-panel-header">
              <h2>Doctor Allocations</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {allocations.length > 0 ? allocations.map((a, i) => (
                <div key={i} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--nurse-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>{a.NAME}</span>
                    <span className="badge-ward" style={{ fontSize: '0.7rem' }}>Today</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.SPECIALIST_AREA}</div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--nurse-primary)' }}>
                    {a.SHIFT_DETAILS}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No doctors allocated yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
