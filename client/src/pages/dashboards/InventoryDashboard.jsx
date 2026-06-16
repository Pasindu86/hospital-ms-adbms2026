import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReceptionDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const invRes = await axios.get(`${API_URL}/pharmacy/drugs`, { headers });
      if (invRes.data?.success) {
        const normalized = invRes.data.drugs.map(item => ({
          DRUG_ID: item.DRUG_ID,
          DRUG_CODE: item.DRUG_CODE,
          DRUG_NAME: item.DRUG_NAME,
          QUANTITY: item.QUANTITY,
          PRICE: item.PRICE,
          CAPACITY: item.CAPACITY,
          BATCH_NUMBER: item.BATCH_NUMBER,
          drugId: item.DRUG_ID,
          drugCode: item.DRUG_CODE,
          drugName: item.DRUG_NAME,
          quantity: item.QUANTITY,
          price: item.PRICE,
          maxStock: item.CAPACITY,
          batchNumber: item.BATCH_NUMBER,
        }));
        setInventory(normalized);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.response?.data?.error || 'Failed to connect to pharmacy API.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Group drugs by their DRUG_CODE using reduce()
  const groupedInventory = Object.values(
    inventory.reduce((acc, curr) => {
      const code = curr.DRUG_CODE || curr.drugCode || '';
      if (!acc[code]) {
        acc[code] = {
          DRUG_CODE: code,
          DRUG_NAME: curr.DRUG_NAME || curr.drugName || '',
          QUANTITY: 0,
          PRICE: curr.PRICE || curr.price || 0,
          CAPACITY: curr.CAPACITY || curr.maxStock || 100
        };
      }
      acc[code].QUANTITY += curr.QUANTITY || curr.quantity || 0;
      return acc;
    }, {})
  );

  const filteredInventory = groupedInventory.filter(item =>
    item.DRUG_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.DRUG_CODE.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = groupedInventory.filter(item => item.QUANTITY < 15);
  const totalDrugsInInventory = groupedInventory.length;

  const navItems = [
    { label: 'Inventory Overview', active: true, path: '/pharmacist/inventory', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg> },
    { label: '+ New Dispense and Billing', active: false, path: '/pharmacist/dispense', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg> },
    { label: 'Restock', active: false, path: '/pharmacist/restock', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> }
  ];

  return (
    <div className="reception-layout">
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
            <button key={item.label} className={`sidebar-nav-item ${item.active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
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
            <input
              type="text"
              placeholder="Search aggregated drugs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            <div className="topbar-divider"></div>
            <div className="user-profile">
              <div className="topbar-avatar">PM</div>
              <div className="user-info">
                <span className="user-name">Pharmacist User</span>
                <span className="user-role">Main Pharmacy</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="page-title-row">
            <div className="page-title">
              <h1>Pharmacy Inventory Overview</h1>
              <p>Aggregated read-only summary of drug stock levels across all active batches.</p>
            </div>
          </div>

          {error && (
            <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', color: '#b91c1c', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
              <strong>System Status Hint:</strong> {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-icon red">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /></svg>
              </div>
              <div className="stat-info">
                <div className="stat-label">Critical Alerts (Grouped)</div>
                <div className="stat-value">{lowStockItems.length}</div>
              </div>
              <span className="stat-badge red">Critical</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /></svg>
              </div>
              <div className="stat-info">
                <div className="stat-label">Unique Drugs</div>
                <div className="stat-value">{totalDrugsInInventory}</div>
              </div>
              <span className="stat-badge orange">Live</span>
            </div>
          </div>

          {/* Content Grid */}
          <div className="content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="table-card">
                <div className="table-card-header">
                  <h2>Aggregated Stock Levels</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>Drug Code</th>
                        <th>Drug Name</th>
                        <th>Total Stock</th>
                        <th>UNIT PRICE</th>
                        <th>Capacity Level</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            No drugs found in inventory.
                          </td>
                        </tr>
                      ) : (
                        filteredInventory.map((item) => {
                          const maxVal = item.CAPACITY || 100;
                          const pct = Math.min((item.QUANTITY / maxVal) * 100, 100);

                          let barColor = 'blue';
                          let statusText = 'Normal';
                          let statusClass = 'active';

                          if (item.QUANTITY === 0) {
                            barColor = 'red';
                            statusText = 'Out of Stock';
                            statusClass = 'deactivated';
                          } else if (item.QUANTITY < 15) {
                            barColor = 'red';
                            statusText = 'Critical';
                            statusClass = 'deactivated';
                          } else if (item.QUANTITY < 35) {
                            barColor = 'indigo';
                            statusText = 'Low Stock';
                            statusClass = 'deactivated';
                          }

                          return (
                            <tr key={item.DRUG_CODE}>
                              <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>#{item.DRUG_CODE}</td>
                              <td style={{ fontWeight: '600' }}>{item.DRUG_NAME}</td>
                              <td>{item.QUANTITY} / {maxVal}</td>
                              <td>LKR {item.PRICE || '0.00'}</td>
                              <td style={{ width: '25%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div className="dept-load-bar" style={{ flex: 1, height: '8px', background: '#e2e8f0' }}>
                                    <div className={`dept-load-fill ${barColor}`} style={{ width: `${pct}%`, height: '100%' }} />
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>{Math.round(pct)}%</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className={`status-badge ${statusClass}`}>{statusText}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="right-sidebar">
              <div className="side-card">
                <div className="side-card-header">Low Stock Alerts</div>
                <div className="side-card-body">
                  {lowStockItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      All drug items are well supplied.
                    </div>
                  ) : (
                    lowStockItems.map((item) => {
                      const maxVal = item.CAPACITY || 100;
                      const pct = Math.min((item.QUANTITY / maxVal) * 100, 100);

                      return (
                        <div className="dept-load-item" key={item.DRUG_CODE}>
                          <div className="dept-load-top">
                            <span className="dept-load-name" style={{ fontWeight: '600' }}>{item.DRUG_NAME}</span>
                            <span className="dept-load-pct" style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.QUANTITY} Left</span>
                          </div>
                          <div className="dept-load-bar">
                            <div className="dept-load-fill red" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>


            </div>
          </div>
        </main>

        <footer className="admin-footer">
          <span>© 2026 CarePulse Health Systems. Pharmacy Division.</span>
        </footer>
      </div>
    </div>
  );
}
