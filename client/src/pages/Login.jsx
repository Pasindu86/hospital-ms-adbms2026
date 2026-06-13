import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const API_URL = 'http://localhost:5000/api';

export default function Login() {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId || !password) {
      setError('Please enter your Staff ID/Email and Password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/auth/login`, { staffId, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        {/* Blue Medical Pulse Logo */}
        <div className="logo-container">
          <div className="pulse-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <h1 className="hms-title">CarePulse HMS</h1>
        <p className="hms-subtitle">Staff Access Portal</p>

        <form onSubmit={handleSubmit} className="hms-form">
          {error && <div className="error-message">{error}</div>}

          {/* Staff ID / Email Field */}
          <div className="input-group">
            <label htmlFor="staffId">Staff ID or Email</label>
            <div className="input-field-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="staffId"
                type="text"
                placeholder="e.g. 0001 or admin@carepulse.local"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="input-group">
            <div className="password-header">
              <label htmlFor="password">Password</label>
              <a href="#forgot" className="forgot-password-btn" onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>
            <div className="input-field-wrapper">
              <span className="field-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Keep logged in checkbox */}
          <div className="checkbox-row">
            <label className="custom-checkbox">
              <input type="checkbox" />
              <span className="box-indicator"></span>
              Keep me logged in
            </label>
          </div>

          {/* Sign In Button */}
          <button type="submit" className="signin-submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner-loader"></span>
            ) : (
              <>
                Sign In
                <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Network Status indicator */}
      <div className="network-status">
        <span className="status-dot"></span>
        HMS Internal Network Secure
      </div>

      {/* Footer Info */}
      <footer className="portal-footer">
        <div className="footer-title">CAREPULSE HEALTH SYSTEMS</div>
        <div className="footer-copyright">© 2024 CarePulse Hospital Management. All rights reserved.</div>
      </footer>
    </div>
  );
}
