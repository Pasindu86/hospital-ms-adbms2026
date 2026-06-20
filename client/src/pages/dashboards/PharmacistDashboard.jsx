import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PharmacistDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function PharmacistDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [dispensingId, setDispensingId] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await axios.get(`${API_URL}/pharmacist/prescriptions/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrescriptions(res.data.prescriptions || []);
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDispense = async (id) => {
    try {
      setDispensingId(id);
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/pharmacist/prescriptions/dispense/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from list
      setPrescriptions(prescriptions.filter(p => p.PRESCRIPTION_ID !== id));
    } catch (err) {
      console.error('Failed to dispense:', err);
      alert('Failed to dispense prescription. Please try again.');
    } finally {
      setDispensingId(null);
    }
  };

  return (
    <div className="pharmacist-layout">
      {/* Sidebar */}
      <aside className="pharmacist-sidebar">
        <div className="pharmacist-sidebar-brand">
          <div className="pharmacist-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /></svg>
          </div>
          <div className="sidebar-brand-text">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>CarePulse</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pharmacy Portal</span>
          </div>
        </div>
        <nav className="pharmacist-sidebar-nav">
          <button className="pharmacist-nav-item active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            Pending Orders
          </button>
          <button className="pharmacist-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
            Inventory
          </button>
          <button className="pharmacist-nav-item" style={{ marginTop: 'auto' }} onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pharmacist-main-area">
        <header className="pharmacist-header">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Prescription Queue</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.875rem' }}>Review and dispense incoming medical orders.</p>
          </div>
          <button onClick={fetchPrescriptions} style={{ background: '#f1f5f9', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
            Refresh Queue
          </button>
        </header>

        <div className="pharmacist-content">
          {loading ? (
            <div className="empty-state">Loading prescriptions...</div>
          ) : prescriptions.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              <h3>No Pending Prescriptions</h3>
              <p>All clear! There are currently no new orders from doctors.</p>
            </div>
          ) : (
            <div className="prescription-grid">
              {prescriptions.map(p => (
                <div key={p.PRESCRIPTION_ID} className="prescription-card">
                  <div className="prescription-card-header">
                    <div className="prescription-patient-info">
                      <span className="patient-name">{p.PATIENT_NAME}</span>
                      <span className="doctor-name">Prescribed by {p.DOCTOR_NAME}</span>
                      <span className="doctor-name" style={{fontSize: '0.75rem', marginTop: '4px'}}>
                        {new Date(p.PRESCRIBED_DATE).toLocaleString()}
                      </span>
                    </div>
                    <span className="status-badge">Pending</span>
                  </div>
                  
                  <div className="prescription-items">
                    {p.ITEMS.map((item, idx) => (
                      <div key={idx} className="medication-item">
                        <div className="drug-name">
                          <span>{item.DRUG_NAME} <span style={{color:'#94a3b8', fontSize:'0.75rem', fontWeight:'normal'}}>({item.DRUG_CODE})</span></span>
                          <span className="drug-qty">{item.DURATION}</span>
                        </div>
                        <div className="drug-instructions">{item.DOSAGE} — {item.INSTRUCTIONS}</div>
                      </div>
                    ))}
                  </div>

                  <div className="prescription-actions">
                    <button 
                      className="btn-dispense" 
                      onClick={() => handleDispense(p.PRESCRIPTION_ID)}
                      disabled={dispensingId === p.PRESCRIPTION_ID}
                    >
                      {dispensingId === p.PRESCRIPTION_ID ? 'Dispensing...' : 'Dispense Medications'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
