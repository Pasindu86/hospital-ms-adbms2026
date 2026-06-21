import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import './ReceptionDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function PharmacyDispense() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const pharmacistName = user?.name || "Pharmacist User";
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Local Form state for manual / custom dispensing
  const [dispenseForm, setDispenseForm] = useState({
    prescriptionId: '',
    drugId: '',
    dosage: '',
    duration: '',
    instructions: ''
  });
  const [showDispenseModal, setShowDispenseModal] = useState(false);

  // Local Form state for adding new medicine
  const [addDrugForm, setAddDrugForm] = useState({
    drugCode: '',
    drugName: '',
    initialQuantity: '',
    maxStock: '',
    price: '',
    manufactureDate: '',
    expireDate: '',
    batchNumber: '',
    isShortcut: false
  });
  const [isAddDrugOpen, setIsAddDrugOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const presRes = await axios.get(`${API_URL}/pharmacy/prescriptions`, { headers });
      if (presRes.data?.success) {
        setPrescriptions(presRes.data.prescriptions);
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
    }
  };

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
          ...item,
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
      setError(
        err.response?.data?.error ||
        'Failed to connect to pharmacy API.'
      );
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    await Promise.allSettled([
      fetchPrescriptions(),
      fetchInventory()
    ]);
    setLoading(false);
  };

  const handleDispense = async (prescriptionId, drugId, dosage, duration, instructions) => {
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API_URL}/pharmacy/dispense`, {
        prescriptionId,
        drugId,
        dosage,
        duration,
        instructions
      }, { headers });

      setSuccessMsg(response.data.message || 'Prescription item dispensed successfully!');
      fetchData();
      setShowDispenseModal(false);
    } catch (err) {
      console.error('Error dispensing medicine:', err);
      setError(err.response?.data?.error || 'Dispensing failed. Check drug stock levels.');
    }
  };

  const handleOpenAddDrugModal = () => {
    setAddDrugForm({
      drugCode: '',
      drugName: '',
      initialQuantity: '',
      maxStock: '',
      price: '',
      manufactureDate: '',
      expireDate: '',
      batchNumber: '',
      isShortcut: false
    });
    setIsAddDrugOpen(true);
  };

  const handleAddBatchShortcut = (item) => {
    setAddDrugForm({
      drugCode: item.DRUG_CODE || item.drugCode || '',
      drugName: item.DRUG_NAME || item.drugName || '',
      initialQuantity: '',
      maxStock: item.CAPACITY || item.maxStock || '',
      price: item.PRICE || item.price || '',
      manufactureDate: '',
      expireDate: '',
      batchNumber: '',
      isShortcut: true
    });
    setIsAddDrugOpen(true);
  };

  const handleAddDrug = async (e) => {
    e.preventDefault();

    const formPayload = {
      drugCode: addDrugForm.drugCode,
      drugName: addDrugForm.drugName,
      initialQuantity: addDrugForm.initialQuantity,
      maxStock: addDrugForm.maxStock,
      price: addDrugForm.price,
      manufactureDate: addDrugForm.manufactureDate,
      expireDate: addDrugForm.expireDate,
      batchNumber: addDrugForm.batchNumber
    };

    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API_URL}/pharmacy/add-drug`, formPayload, { headers });

      setIsAddDrugOpen(false);
      setAddDrugForm({ drugCode: '', drugName: '', initialQuantity: '', maxStock: '', price: '', manufactureDate: '', expireDate: '', batchNumber: '', isShortcut: false });
      setSuccessMsg(response.data.message || 'New medicine added successfully!');
      fetchInventory();
    } catch (err) {
      console.error('Error adding new medicine:', err);
      setError(err.response?.data?.error || 'Failed to add medicine.');
    }
  };

  const handleDeleteDrug = async (drugId) => {
    if (!window.confirm("Are you sure you want to delete this drug?")) {
      return;
    }
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.delete(`${API_URL}/pharmacy/delete-drug/${drugId}`, { headers });
      setSuccessMsg(response.data.message || 'Drug deleted successfully!');
      fetchInventory();
    } catch (err) {
      console.error('Error deleting drug:', err);
      setError(err.response?.data?.error || 'Failed to delete drug.');
    }
  };



  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const filteredInventory = inventory.filter(item =>
    item.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.drugCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => item.QUANTITY < 15);
  const totalPrescriptions = prescriptions.length;
  const criticalStockAlerts = lowStockItems.length;
  const totalDrugsInInventory = inventory.length;

  const navItems = [
    { label: 'Inventory Overview', active: false, path: '/pharmacist/inventory', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg> },
    { label: 'Stock Control', active: true, path: '/pharmacist/dispense', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg> },
    { label: 'Billing & Receipt', active: false, path: '/pharmacist/billing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
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
              placeholder="Search prescriptions, drugs, codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            <div className="topbar-divider"></div>
            <div className="user-profile">
              <div className="topbar-avatar">PM</div>
              <div className="user-info">
                <span className="user-name">{pharmacistName}</span>
                <span className="user-role">Main Pharmacy</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="page-title-row">
            <div className="page-title">
              <h1>Pharmacy &amp; Dispensary</h1>
              <p>Manage pending prescription orders and hospital drug inventory levels.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>

              <button
                className="btn-primary-add"
                onClick={handleOpenAddDrugModal}
                style={{ backgroundColor: '#1d4ed8', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                ＋ Add New Medicine
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', color: '#b91c1c', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
              <strong>System Status Hint:</strong> {error}
            </div>
          )}
          {successMsg && (
            <div style={{ padding: '16px', background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '10px', color: '#065f46', marginBottom: '24px', fontSize: '14px' }}>
              <strong>Success:</strong> {successMsg}
            </div>
          )}

          {/* Stats Cards */}
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-icon red">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /></svg>
              </div>
              <div className="stat-info">
                <div className="stat-label">Critical Alerts</div>
                <div className="stat-value">{criticalStockAlerts}</div>
              </div>
              <span className="stat-badge red">Critical</span>
            </div>

            <div className="stat-card">
              <div className="stat-icon amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /></svg>
              </div>
              <div className="stat-info">
                <div className="stat-label">Monitored Drugs</div>
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
                  <h2>Stock Control</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>Drug Code</th>
                        <th>Drug Name</th>
                        <th>Current Stock</th>
                        <th>UNIT PRICE</th>
                        <th>Capacity Level</th>
                        <th style={{ textAlign: 'right' }}>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
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

                          let expireInfo;
                          if (!item.EXPIRE_DATE) {
                            expireInfo = <span className="text-gray-400">Exp: N/A</span>;
                          } else {
                            const expDate = new Date(item.EXPIRE_DATE);
                            const formattedDate = String(expDate.getDate()).padStart(2, '0') + '/' + String(expDate.getMonth() + 1).padStart(2, '0') + '/' + expDate.getFullYear();

                            if (expDate <= new Date()) {
                              expireInfo = (
                                <span className="text-gray-400">
                                  Exp: {formattedDate}
                                  <span className="text-red-600 font-bold text-[11px] mt-0.5 block">(Expired)</span>
                                </span>
                              );
                            } else {
                              expireInfo = <span className="text-gray-400">Exp: {formattedDate}</span>;
                            }
                          }

                          return (
                            <tr key={item.DRUG_ID}>
                              <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>#{item.DRUG_CODE}{item.BATCH_NUMBER ? ` - Batch: ${item.BATCH_NUMBER}` : ''}</td>
                              <td style={{ fontWeight: '600' }}>
                                {item.DRUG_NAME}
                                <div className="text-xs mt-0.5 block line-height-tight">
                                  {expireInfo}
                                </div>
                              </td>
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
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <button
                                    onClick={() => handleAddBatchShortcut(item)}
                                    className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors duration-200"
                                    title="Add New Batch"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDrug(item.DRUG_ID)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                    title="Delete Drug"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                  </button>
                                </div>
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
                <div className="side-card-header">Critical Stock Alerts</div>
                <div className="side-card-body">
                  {lowStockItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      All drug items are well supplied.
                    </div>
                  ) : (
                    lowStockItems.map((item) => {
                      const maxVal = item.maxStock || 100;
                      const pct = Math.min((item.quantity / maxVal) * 100, 100);

                      return (
                        <div className="dept-load-item" key={item.drugId}>
                          <div className="dept-load-top">
                            <span className="dept-load-name" style={{ fontWeight: '600' }}>{item.drugName}</span>
                            <span className="dept-load-pct" style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.quantity} Left</span>
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

              <div className="side-card">
                <div className="side-card-header">Pharmacy Guide</div>
                <div className="side-card-body" style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                  <p style={{ marginBottom: '12px' }}>
                    Verify drug dosage instructions carefully before dispensing medication to patients.
                  </p>
                  <p>
                    Stock level alerts automatically flag any medicine items falling below 15 units.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="admin-footer">
          <span>© 2026 CarePulse Health Systems. Pharmacy Division.</span>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </footer>
      </div>

      {/* Manual Dispense Modal */}
      {showDispenseModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDispenseModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Manual Dispense Form</h3>
              <button className="modal-close" onClick={() => setShowDispenseModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="form-field">
                  <label>Prescription ID</label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={dispenseForm.prescriptionId}
                    onChange={e => setDispenseForm({ ...dispenseForm, prescriptionId: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Drug ID</label>
                  <select
                    value={dispenseForm.drugId}
                    onChange={e => setDispenseForm({ ...dispenseForm, drugId: e.target.value })}
                  >
                    <option value="">Select Drug</option>
                    {inventory.map(d => (
                      <option key={d.drugId} value={d.drugId}>{d.drugName} (Stock: {d.quantity})</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 tab daily"
                    value={dispenseForm.dosage}
                    onChange={e => setDispenseForm({ ...dispenseForm, dosage: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 7 Days"
                    value={dispenseForm.duration}
                    onChange={e => setDispenseForm({ ...dispenseForm, duration: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Instructions</label>
                  <input
                    type="text"
                    placeholder="Take after meals"
                    value={dispenseForm.instructions}
                    onChange={e => setDispenseForm({ ...dispenseForm, instructions: e.target.value })}
                  />
                </div>
                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: '16px' }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowDispenseModal(false)}>Cancel</button>
                  <button type="button" className="btn-submit">Dispense Medicine</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Medicine Modal with SCROLL FIX & FIELD LOCKING */}
      {isAddDrugOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIsAddDrugOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              paddingRight: '12px'
            }}
          >
            <div className="modal-header">
              <h3>{addDrugForm.isShortcut ? '＋ Add New Batch to Stock' : '＋ Add New Medicine to Inventory'}</h3>
              <button className="modal-close" onClick={() => setIsAddDrugOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddDrug} className="modal-form">
                <div className="form-field">
                  <label>Drug Code</label>
                  <input
                    type="text"
                    placeholder="e.g. D004"
                    value={addDrugForm.drugCode}
                    onChange={e => setAddDrugForm({ ...addDrugForm, drugCode: e.target.value })}
                    required
                    disabled={addDrugForm.isShortcut}
                    style={addDrugForm.isShortcut ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                  />
                </div>

                <div className="form-field">
                  <label>Drug Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin 500mg"
                    value={addDrugForm.drugName}
                    onChange={e => setAddDrugForm({ ...addDrugForm, drugName: e.target.value })}
                    required
                    disabled={addDrugForm.isShortcut}
                    style={addDrugForm.isShortcut ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                  />
                </div>

                <div className="form-field">
                  <label>Batch Number</label>
                  <input
                    type="text"
                    placeholder="e.g. B02"
                    value={addDrugForm.batchNumber}
                    onChange={e => setAddDrugForm({ ...addDrugForm, batchNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Initial Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={addDrugForm.initialQuantity}
                    onChange={e => setAddDrugForm({ ...addDrugForm, initialQuantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Maximum Capacity Level</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={addDrugForm.maxStock}
                    onChange={e => setAddDrugForm({ ...addDrugForm, maxStock: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Unit Price (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45.00"
                    value={addDrugForm.price}
                    onChange={e => setAddDrugForm({ ...addDrugForm, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Manufacture Date</label>
                  <input
                    type="date"
                    value={addDrugForm.manufactureDate}
                    onChange={e => setAddDrugForm({ ...addDrugForm, manufactureDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    value={addDrugForm.expireDate}
                    onChange={e => setAddDrugForm({ ...addDrugForm, expireDate: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: '24px' }}>
                  <button type="button" className="btn-cancel" onClick={() => setIsAddDrugOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" style={{ backgroundColor: '#1d4ed8' }}>Confirm &amp; Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
