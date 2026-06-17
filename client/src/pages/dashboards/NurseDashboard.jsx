import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NurseDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nurseData, setNurseData] = useState(null);
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
      const res = await axios.get(`${API_URL}/nurse/me`, { headers });
      setNurseData(res.data);
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
  const todayDoctorAllocations = nurseData?.todayAllocations || [];
  const todayWardAllocations = nurseData?.todayWardAllocations || [];
  const allDoctorAllocations = nurseData?.allocations || [];
  const allWardAllocations = nurseData?.wardAllocations || [];

  const hasTodayDuty = todayDoctorAllocations.length > 0 || todayWardAllocations.length > 0;

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
        <header className="nurse-header">
          <div>
            <h1 className="nurse-welcome">Welcome back, {profile.NAME || 'Nurse'}</h1>
            <p className="nurse-subtitle">Your duty schedule at a glance</p>
          </div>
          <div className="nurse-nurse-info">
            <div className="nurse-avatar-circle">{profile.NAME ? profile.NAME.substring(0, 2).toUpperCase() : 'N'}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{profile.NAME}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{profile.LICENSE_NUMBER}</div>
            </div>
          </div>
        </header>

        {error && <div className="nurse-error-msg">{error}</div>}

        {/* Today's Duty - Prominent Section */}
        <section className="today-duty-section">
          <div className="today-duty-header">
            <h2>Today's Duty</h2>
            <span className="today-badge">Today</span>
          </div>

          {hasTodayDuty ? (
            <div className="today-duty-grid">
              {/* Today's Doctor Allocations */}
              <div className="today-duty-card doctor">
                <div className="today-duty-card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /></svg>
                </div>
                <h3>Doctor Duty</h3>
                {todayDoctorAllocations.length > 0 ? todayDoctorAllocations.map((a, i) => (
                  <div key={i} className="today-allocation-item">
                    <div className="today-allocation-name">Dr. {a.NAME}</div>
                    <div className="today-allocation-detail">{a.SPECIALIST_AREA}</div>
                    <div className="today-allocation-shift">{a.SHIFT_DETAILS}</div>
                  </div>
                )) : (
                  <div className="today-no-duty">No doctor duty today</div>
                )}
              </div>

              {/* Today's Ward Allocations */}
              <div className="today-duty-card ward">
                <div className="today-duty-card-icon ward-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" /><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" /></svg>
                </div>
                <h3>Ward Duty</h3>
                {todayWardAllocations.length > 0 ? todayWardAllocations.map((w, i) => (
                  <div key={i} className="today-allocation-item">
                    <div className="today-allocation-name">{w.WARD_NAME}</div>
                    <div className="today-allocation-shift">{w.SHIFT_DETAILS}</div>
                  </div>
                )) : (
                  <div className="today-no-duty">No ward duty today</div>
                )}
              </div>
            </div>
          ) : (
            <div className="today-no-duty-full">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /></svg>
              <p>No duty assigned for today</p>
            </div>
          )}
        </section>

        {/* All Duties - Separated by Type */}
        <div className="duties-grid">
          {/* Doctor Allocations */}
          <section className="duty-panel">
            <div className="duty-panel-header">
              <h2>Doctor Allocations</h2>
              <span className="duty-count-badge">{allDoctorAllocations.length} Total</span>
            </div>
            <div className="duty-list">
              {allDoctorAllocations.length > 0 ? allDoctorAllocations.map((a, i) => (
                <div key={i} className="duty-card doctor-duty-card">
                  <div className="duty-card-date">
                    {new Date(a.ALLOCATION_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="duty-card-main">
                    <div className="duty-card-name">Dr. {a.NAME}</div>
                    <div className="duty-card-detail">{a.SPECIALIST_AREA}</div>
                  </div>
                  <div className="duty-card-shift">{a.SHIFT_DETAILS}</div>
                </div>
              )) : (
                <div className="duty-empty">No doctor allocations found.</div>
              )}
            </div>
          </section>

          {/* Ward Allocations */}
          <section className="duty-panel">
            <div className="duty-panel-header">
              <h2>Ward Allocations</h2>
              <span className="duty-count-badge ward-badge">{allWardAllocations.length} Total</span>
            </div>
            <div className="duty-list">
              {allWardAllocations.length > 0 ? allWardAllocations.map((w, i) => (
                <div key={i} className="duty-card ward-duty-card">
                  <div className="duty-card-date">
                    {new Date(w.ALLOCATION_DATE).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="duty-card-main">
                    <div className="duty-card-name">{w.WARD_NAME}</div>
                    <div className="duty-card-detail">Ward Assignment</div>
                  </div>
                  <div className="duty-card-shift">{w.SHIFT_DETAILS}</div>
                </div>
              )) : (
                <div className="duty-empty">No ward allocations found.</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
