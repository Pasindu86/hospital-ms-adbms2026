import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReceptionDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function PharmacyRestock() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Restock modal form state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockForm, setRestockForm] = useState({
    drugCode: '',
    drugName: '',
    initialQuantity: '',
    batchNumber: '',
    maxStock: '500',
    price: '10.00',
    manufactureDate: new Date().toISOString().split('T')[0],
    expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isShortcut: false
  });

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

  const handleOpenAddStockModal = () => {
    setRestockForm({
      drugCode: '',
      drugName: '',
      initialQuantity: '',
      batchNumber: '',
      maxStock: '500',
      price: '10.00',
      manufactureDate: new Date().toISOString().split('T')[0],
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isShortcut: false
    });
    setIsRestockOpen(true);
  };

  const handleAddBatchShortcut = (item) => {
    setRestockForm({
      drugCode: item.DRUG_CODE || item.drugCode || '',
      drugName: item.DRUG_NAME || item.drugName || '',
      initialQuantity: '',
      batchNumber: '',
      maxStock: item.CAPACITY || item.maxStock || '500',
      price: item.PRICE || item.price || '10.00',
      manufactureDate: new Date().toISOString().split('T')[0],
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isShortcut: true
    });
    setIsRestockOpen(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    const formPayload = {
      drugCode: restockForm.drugCode,
      drugName: restockForm.drugName,
      initialQuantity: restockForm.initialQuantity,
      maxStock: restockForm.maxStock,
      price: restockForm.price,
      manufactureDate: restockForm.manufactureDate,
      expireDate: restockForm.expireDate,
      batchNumber: restockForm.batchNumber
    };

    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(`${API_URL}/pharmacy/add-drug`, formPayload, { headers });

      setIsRestockOpen(false);
      setSuccessMsg(response.data.message || 'Restock batch added successfully!');
      fetchInventory();
    } catch (err) {
      console.error('Error submitting restock batch:', err);
      setError(err.response?.data?.error || 'Failed to submit restock request.');
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.drugCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems = [
    { label: 'Inventory Overview', active: false, path: '/pharmacist/inventory', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg> },
    { label: 'Stock Control', active: false, path: '/pharmacist/dispense', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg> },
    { label: 'Billing & Receipt', active: false, path: '/pharmacist/billing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
    { label: 'Restock', active: true, path: '/pharmacist/restock', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> }
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
              placeholder="Search drugs to restock..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="topbar-right">
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
              <h1>Pharmacy &amp; Stock Control</h1>
              <p>Manage and log medicine restock requests for inventory supply.</p>
            </div>
            <div>
              <button
                onClick={handleOpenAddStockModal}
                style={{ backgroundColor: '#1d4ed8', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add New Stock
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

          <div className="table-card">
            <div className="table-card-header">
              <h2>Current Inventory Stock List</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Drug Code</th>
                    <th>Drug Name</th>
                    <th>Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '32px' }}>Loading inventory...</td>
                    </tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>No drugs found.</td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => (
                      <tr key={item.DRUG_ID}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>#{item.DRUG_CODE}{item.BATCH_NUMBER ? ` - Batch: ${item.BATCH_NUMBER}` : ''}</td>
                        <td style={{ fontWeight: '600' }}>{item.DRUG_NAME}</td>
                        <td>{item.QUANTITY}</td>
                        <td>
                          <button
                            onClick={() => handleAddBatchShortcut(item)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors duration-200"
                            title="Add New Batch"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <footer className="admin-footer">
          <span>© 2026 CarePulse Health Systems. Pharmacy Division.</span>
        </footer>
      </div>

      {/* Add New Batch Modal */}
      {isRestockOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIsRestockOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxHeight: '85vh',
              overflowY: 'auto',
              paddingRight: '12px',
              maxWidth: '500px'
            }}
          >
            <div className="modal-header">
              <h3>Add New Batch to Stock</h3>
              <button className="modal-close" onClick={() => setIsRestockOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleRestockSubmit} className="modal-form">
                <div className="form-field">
                  <label>Drug Code</label>
                  <input
                    type="text"
                    placeholder="e.g. D004"
                    value={restockForm.drugCode}
                    onChange={e => setRestockForm({ ...restockForm, drugCode: e.target.value })}
                    required
                    disabled={restockForm.isShortcut}
                    style={restockForm.isShortcut ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                  />
                </div>

                <div className="form-field">
                  <label>Drug Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxicillin 500mg"
                    value={restockForm.drugName}
                    onChange={e => setRestockForm({ ...restockForm, drugName: e.target.value })}
                    required
                    disabled={restockForm.isShortcut}
                    style={restockForm.isShortcut ? { backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}}
                  />
                </div>

                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={restockForm.initialQuantity}
                    onChange={e => setRestockForm({ ...restockForm, initialQuantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Batch Number</label>
                  <input
                    type="text"
                    placeholder="e.g. B02"
                    value={restockForm.batchNumber}
                    onChange={e => setRestockForm({ ...restockForm, batchNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Maximum Capacity Level</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={restockForm.maxStock}
                    onChange={e => setRestockForm({ ...restockForm, maxStock: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Unit Price (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45.00"
                    value={restockForm.price}
                    onChange={e => setRestockForm({ ...restockForm, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Manufacture Date</label>
                  <input
                    type="date"
                    value={restockForm.manufactureDate}
                    onChange={e => setRestockForm({ ...restockForm, manufactureDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    value={restockForm.expireDate}
                    onChange={e => setRestockForm({ ...restockForm, expireDate: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: '24px' }}>
                  <button type="button" className="btn-cancel" onClick={() => setIsRestockOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" style={{ backgroundColor: '#1d4ed8' }}>Confirm</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
