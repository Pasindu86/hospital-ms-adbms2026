import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NurseDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nurseData, setNurseData] = useState(null);
  const [wardDetails, setWardDetails] = useState(null);
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

      const [nurseResult, wardResult] = await Promise.allSettled([
        axios.get(`${API_URL}/nurse/me`, { headers }),
        axios.get(`${API_URL}/nurse/ward/details`, { headers })
      ]);

      if (nurseResult.status === 'fulfilled') {
        setNurseData(nurseResult.value.data);
      } else {
        console.error('Failed to fetch nurse profile:', nurseResult.reason);
        setError('Failed to load nurse profile. ' + (nurseResult.reason?.response?.data?.error || ''));
      }

      if (wardResult.status === 'fulfilled') {
        setWardDetails(wardResult.value.data);
      } else {
        console.error('Failed to fetch ward details:', wardResult.reason);
      }

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
  const wardAllocations = nurseData?.wardAllocations || [];
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div className="nurse-stat-info">
              <span className="nurse-stat-label">Ward Occupancy</span>
              <span className="nurse-stat-value">{wardDetails?.patientCount || 0} Patients</span>
            </div>
          </div>
        </div>

        <div className="nurse-content-grid">

          {/* Doctor Allocation List */}
          <div className="nurse-panel">
            <div className="nurse-panel-header">
              <h2>My Allocations (Doctors)</h2>
              <span className="badge-ward" style={{ background: 'var(--nurse-primary-light)', color: 'var(--nurse-primary)' }}>
                {allocations.length} Shifts
              </span>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
              {allocations.length > 0 ? allocations.map((a, i) => (
                <div key={i} style={{ padding: '1rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: '1px solid var(--nurse-primary)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--nurse-primary)' }}>
                    {new Date(a.ALLOCATION_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>{a.NAME}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.SPECIALIST_AREA}</div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--nurse-primary)' }}>
                    Shift: {a.SHIFT_DETAILS}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No doctors allocated yet.</div>
              )}
            </div>

          </div>

          <div className="nurse-panel">
            <div className="nurse-panel-header">
              <h2>My Allocations (Wards)</h2>
              <span className="badge-ward" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--nurse-secondary)' }}>
                {wardAllocations.length} Shifts
              </span>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {wardAllocations.length > 0 ? wardAllocations.map((w, i) => (
                <div key={i} style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid var(--nurse-secondary)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--nurse-secondary)' }}>
                    {new Date(w.ALLOCATION_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{w.WARD_NAME}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--nurse-text-muted)' }}>
                    Assigned Ward Shift
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--nurse-secondary)' }}>
                    Shift: {w.SHIFT_DETAILS}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No wards allocated yet.</div>
              )}
            </div>

            <div className="nurse-panel-header" style={{ borderTop: '1px solid var(--nurse-border)' }}>
              <h2>Other On-Duty Nurses</h2>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {wardDetails?.nurses?.length > 0 ? wardDetails.nurses.map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '12px' }}>
                  <div className="nurse-avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>{n.NAME.substring(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{n.NAME}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{n.LICENSE_NUMBER}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{n.PHONE_NUMBER}</div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No other nurses in this ward.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
