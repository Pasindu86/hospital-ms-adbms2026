import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReceptionDashboard.css';

const API_URL = 'http://localhost:5000/api';

export default function PharmacyBilling() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Billing Form state
  const [billingForm, setBillingForm] = useState({ patientName: '', contactNumber: '' });
  const [billingItems, setBillingItems] = useState([]);
  const [currentBillItem, setCurrentBillItem] = useState({ drugId: '', quantity: 1 });

  useEffect(() => {
    fetchData();
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
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    await fetchInventory();
    setLoading(false);
  };

  const handleAddBillingItem = () => {
    if (!currentBillItem.drugId || !currentBillItem.quantity) return;
    const selectedDrug = inventory.find(d => String(d.DRUG_ID) === String(currentBillItem.drugId));
    if (!selectedDrug) return;

    const qty = Number(currentBillItem.quantity);
    if (qty <= 0) return;

    const drugPrice = selectedDrug.PRICE || 0;

    const existingIndex = billingItems.findIndex(item => String(item.drugId) === String(currentBillItem.drugId));
    if (existingIndex > -1) {
      const updated = [...billingItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * Number(drugPrice);
      setBillingItems(updated);
    } else {
      setBillingItems([
        ...billingItems,
        {
          drugId: selectedDrug.DRUG_ID,
          drugName: selectedDrug.DRUG_NAME,
          price: Number(drugPrice),
          quantity: qty,
          subtotal: qty * Number(drugPrice)
        }
      ]);
    }
    setCurrentBillItem({ drugId: '', quantity: 1 });
  };

  const handleRemoveBillingItem = (index) => {
    const updated = [...billingItems];
    updated.splice(index, 1);
    setBillingItems(updated);
  };

  const handleConfirmAndPrint = async () => {
    if (!billingForm.patientName || billingItems.length === 0) {
      alert('Please provide patient name and at least one drug item.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      for (const item of billingItems) {
        await axios.post(`${API_URL}/pharmacy/deduct-stock`, {
          drugId: Number(item.drugId),
          quantity: Number(item.quantity)
        }, { headers });
      }

      const grandTotal = billingItems.reduce((acc, curr) => acc + curr.subtotal, 0);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const receiptHtml = `
          <html>
            <head>
              <title>CarePulse Receipt</title>
              <style>
                body { font-family: sans-serif; padding: 20px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .details { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                .total { font-weight: bold; font-size: 1.2em; text-align: right; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>CarePulse Hospital</h2>
                <p>Pharmacy & Dispensary Division</p>
              </div>
              <div class="details">
                <p><strong>Patient Name:</strong> ${billingForm.patientName}</p>
                <p><strong>Contact Number:</strong> ${billingForm.contactNumber || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Qty</th>
                    <th>Unit Price (Rs.)</th>
                    <th>Subtotal (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${billingItems.map(item => `
                    <tr>
                      <td>${item.drugName}</td>
                      <td>${item.quantity}</td>
                      <td>LKR ${Number(item.price).toFixed(2)}</td>
                      <td>LKR ${Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">
                Grand Total: LKR ${grandTotal.toFixed(2)}
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `;
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
      }

      setBillingItems([]);
      setBillingForm({ patientName: '', contactNumber: '' });
      fetchInventory();
    } catch (err) {
      console.error('Error in Billing & Dispensing:', err);
      alert(err.response?.data?.error || 'Failed to process billing and update stock.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { label: 'Inventory Overview', active: false, path: '/pharmacist/inventory', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg> },
    { label: 'Stock Control', active: false, path: '/pharmacist/dispense', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg> },
    { label: 'Billing & Receipt', active: true, path: '/pharmacist/billing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
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
          <div className="topbar-right" style={{ marginLeft: 'auto' }}>
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
              <h1>Prescription Billing &amp; Invoicing</h1>
              <p>Generate PDF receipt invoices and dispense medicine records.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            <div className="table-card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div className="table-card-header">
                <h2>New Dispense &amp; Digital Billing Receipt</h2>
              </div>
              <div style={{ padding: '24px' }}>
                <div className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-field">
                      <label style={{ fontWeight: '600', color: '#334155' }}>Patient Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Nimal Perera"
                        value={billingForm.patientName}
                        onChange={e => setBillingForm({ ...billingForm, patientName: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>
                    <div className="form-field">
                      <label style={{ fontWeight: '600', color: '#334155' }}>Contact Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 0771234567"
                        value={billingForm.contactNumber}
                        onChange={e => setBillingForm({ ...billingForm, contactNumber: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>Add Prescribed Drug Row</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '16px', alignItems: 'end' }}>
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: '500', color: '#475569' }}>Select Stock Med</label>
                        <select
                          value={currentBillItem.drugId}
                          onChange={e => setCurrentBillItem({ ...currentBillItem, drugId: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}
                        >
                          <option value="">-- Choose Item --</option>
                          {inventory.map(d => (
                            <option key={d.DRUG_ID} value={d.DRUG_ID}>
                              {d.DRUG_NAME} [Batch: {d.BATCH_NUMBER || 'N/A'}] (Available: {d.QUANTITY})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label style={{ fontWeight: '500', color: '#475569' }}>Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={currentBillItem.quantity}
                          onChange={e => setCurrentBillItem({ ...currentBillItem, quantity: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddBillingItem}
                        style={{ padding: '10px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', height: '42px' }}
                      >
                        ＋ Add
                      </button>
                    </div>
                  </div>

                  {/* Queue Summary Table */}
                  <div style={{ marginTop: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Med Name</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Qty</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Price</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Subtotal</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingItems.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No items pushed to statement yet.</td>
                          </tr>
                        ) : (
                          billingItems.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 8px', fontWeight: '500' }}>{item.drugName}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>{item.quantity}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right' }}>LKR {item.price.toFixed(2)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right' }}>LKR {item.subtotal.toFixed(2)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <button type="button" onClick={() => handleRemoveBillingItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #e2e8f0' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                      Grand Total: LKR {billingItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setBillingItems([]);
                          setBillingForm({ patientName: '', contactNumber: '' });
                        }}
                        style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Reset Form
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAndPrint}
                        style={{ padding: '10px 20px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        🖨️ Confirm &amp; Print Receipt
                      </button>
                    </div>
                  </div>
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
