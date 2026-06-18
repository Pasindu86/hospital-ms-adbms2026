import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = 'http://localhost:5000/api';

const staffData = [
  { id: 1, initials: 'JD', name: 'Dr. James Doe', role: 'Senior Surgeon', dept: 'General Surgery', status: 'active', avColor: 'av-blue' },
  { id: 2, initials: 'MS', name: 'Maria Smith', role: 'Head Nurse', dept: 'Cardiology', status: 'active', avColor: 'av-green' },
  { id: 3, initials: 'RK', name: 'Robert King', role: 'Pharmacist', dept: 'Main Pharmacy', status: 'deactivated', avColor: 'av-purple' },
  { id: 4, initials: 'LW', name: 'Linda White', role: 'Receptionist', dept: 'Front Desk', status: 'active', avColor: 'av-amber' },
];

const deptLoad = [
  { name: 'Cardiology', pct: 28, color: 'blue' },
  { name: 'Emergency', pct: 45, color: 'red' },
  { name: 'Pediatrics', pct: 15, color: 'indigo' },
];

const recentActions = [
  {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="16" x2="22" y1="11" y2="11" /></svg>,
    color: 'green',
    title: 'New Staff Onboarded',
    desc: 'Sarah Jenkins • Cardiology',
    time: '2 HOURS AGO'
  },
  {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
    color: 'blue',
    title: 'Profile Updated',
    desc: 'Dr. Alan Turing • Neurology',
    time: '5 HOURS AGO'
  },
  {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>,
    color: 'red',
    title: 'License Expiry Warning',
    desc: 'Dr. Gregory House • Diagnostics',
    time: '1 DAY AGO'
  },
];

const stats = [
  {
    label: 'Total Doctors', value: '42', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /><path d="M12 5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" /><path d="M9 3v2" /><path d="M15 3v2" /><path d="M12 14v4" /><path d="M10 16h4" /></svg>
    ), color: 'blue', badge: '+4%', badgeColor: 'green'
  },
  {
    label: 'Total Patients', value: '1,240', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ), color: 'purple', badge: '+12%', badgeColor: 'green'
  },
  {
    label: 'Active Appointments', value: '85', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
    ), color: 'amber', badge: 'Busy', badgeColor: 'orange'
  },
  {
    label: 'Low Stock Alerts', value: '12', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
    ), color: 'red', badge: 'Critical', badgeColor: 'red'
  },
];

const navItems = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
    ), label: 'Dashboards'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ), label: 'Patients'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
    ), label: 'Appointments'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
    ), label: 'Staff', active: true
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M12 14v3" /><path d="M10.5 15.5 12 17l1.5-1.5" /></svg>
    ), label: 'Schedules'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
    ), label: 'Inventory'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>
    ), label: 'Reports'
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
    ), label: 'Settings'
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeData, setFeeData] = useState({ doctorId: '', name: '', consultationFee: 0, hospitalCharge: 500 });
  const [allocateType, setAllocateType] = useState('doctor'); // 'doctor' or 'ward'
  const [filterDept, setFilterDept] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [availableNurses, setAvailableNurses] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sidebar navigation
  const [activeNav, setActiveNav] = useState('Staff');

  // Schedules view
  const DAY_LABELS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [scheduleDoctors, setScheduleDoctors] = useState([]);
  const [scheduleDoctorId, setScheduleDoctorId] = useState('');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [bulkTime, setBulkTime] = useState({ startTime: '09:00', endTime: '17:00' });
  const [scheduleMsg, setScheduleMsg] = useState({ type: '', text: '' });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Staff Selection Data
  const [adminNurses, setAdminNurses] = useState([]);
  const [adminDoctors, setAdminDoctors] = useState([]);

  // Registration Form
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', role: 'doctor',
    mobileNumber: '', address: '', licenseNumber: '', specialistArea: '', nurses: [], allocatedWard: '', consultationFee: 0, hospitalCharge: 500,
    weeklyStartTime: '09:00', weeklyEndTime: '17:00'
  });

  // Allocation Form
  const [allocateData, setAllocateData] = useState({
    nurseId: '', doctorId: '', allocatedWard: '', allocationDate: '', shiftTime: ''
  });

  useEffect(() => {
    const fetchNurses = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/nurses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAvailableNurses(res.data.nurses || []);
      } catch (err) {
        console.error('Failed to fetch nurses', err);
      }
    };

    const fetchDashboardData = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/dashboard-stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setDashboardStats(res.data.stats);
        setStaffList(res.data.staffData);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };

    fetchNurses();
    fetchDashboardData();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/patients`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/appointments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    }
  };

  const handleNurseToggle = (nurseId) => {
    setFormData(prev => {
      const current = prev.nurses || [];
      if (current.includes(nurseId)) {
        return { ...prev, nurses: current.filter(id => id !== nurseId) };
      } else {
        return { ...prev, nurses: [...current, nurseId] };
      }
    });
  };

  const openAllocateModal = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [nursesRes, doctorsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/nurses`, { headers }),
        axios.get(`${API_URL}/admin/doctors`, { headers })
      ]);
      setAdminNurses(nursesRes.data.nurses || []);
      setAdminDoctors(doctorsRes.data.doctors || []);
      setShowAllocateModal(true);
      setMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Failed to load staff for allocation:', err);
    }
  };

  const handleAllocateDuty = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const endpoint = allocateType === 'doctor'
        ? `${API_URL}/admin/allocate-doctor-duty`
        : `${API_URL}/admin/allocate-ward-duty`;

      const res = await axios.post(endpoint, allocateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ type: 'success', text: res.data.message || 'Duty allocated successfully!' });
      setAllocateData({ nurseId: '', doctorId: '', allocatedWard: '', allocationDate: '', shiftTime: '' });
      setTimeout(() => setShowAllocateModal(false), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Allocation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const openSchedules = async () => {
    setActiveNav('Schedules');
    setScheduleMsg({ type: '', text: '' });
    try {
      const res = await axios.get(`${API_URL}/admin/doctors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setScheduleDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors for schedules', err);
    }
  };

  const loadDoctorSchedule = async (doctorId) => {
    setScheduleDoctorId(doctorId);
    setScheduleMsg({ type: '', text: '' });
    if (!doctorId) {
      setScheduleDays([]);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/admin/doctors/${doctorId}/availability`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setScheduleDays(res.data.availability || []);
    } catch (err) {
      console.error('Failed to load schedule', err);
      setScheduleMsg({ type: 'error', text: 'Failed to load schedule.' });
    }
  };

  const updateScheduleDay = (day, patch) => {
    setScheduleDays(prev => prev.map(d => d.day === day ? { ...d, ...patch } : d));
  };

  const applyBulkTime = () => {
    setScheduleDays(prev => prev.map(d => ({
      ...d, off: false, startTime: bulkTime.startTime, endTime: bulkTime.endTime
    })));
  };

  const saveSchedule = async () => {
    if (!scheduleDoctorId) return;
    setScheduleSaving(true);
    setScheduleMsg({ type: '', text: '' });
    try {
      const res = await axios.put(`${API_URL}/admin/doctors/${scheduleDoctorId}/availability`,
        { days: scheduleDays },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setScheduleMsg({ type: 'success', text: res.data.message || 'Schedule saved!' });
    } catch (err) {
      setScheduleMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save schedule.' });
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      let endpoint = `${API_URL}/auth/register`;
      if (formData.role === 'doctor') {
        endpoint = `${API_URL}/admin/register-doctor`;
      } else if (formData.role === 'nurse') {
        endpoint = `${API_URL}/admin/register-nurse`;
      }

      const res = await axios.post(endpoint, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage({ type: 'success', text: res.data.message || 'Staff registered successfully!' });
      setFilterDept(formData.role);
      setRefreshTrigger(prev => prev + 1);
      setFormData({
        fullName: '', email: '', password: '', role: 'doctor',
        mobileNumber: '', address: '', licenseNumber: '', specialistArea: '', nurses: [], allocatedWard: '', consultationFee: 0, hospitalCharge: 500,
        weeklyStartTime: '09:00', weeklyEndTime: '17:00'
      });
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filterDept !== 'all') {
      const fetchRoleSpecific = async () => {
        try {
          const res = await axios.get(`${API_URL}/admin/staff/${filterDept}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setStaffList(res.data.staff || []);
        } catch (err) {
          console.error('Failed to fetch role specific staff', err);
        }
      };
      fetchRoleSpecific();
    } else {
      // Refresh general stats if "all" is selected
      const fetchDashboardData = async () => {
        try {
          const res = await axios.get(`${API_URL}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setStaffList(res.data.staffData || []);
          if (res.data.stats) setDashboardStats(res.data.stats);
        } catch (err) {
          console.error('Failed to fetch dashboard data', err);
        }
      };
      fetchDashboardData();
    }
  }, [filterDept, refreshTrigger]);

  const filteredStaff = staffList;

  const dynamicStats = dashboardStats ? [
    {
      label: 'Total Doctors', value: dashboardStats.TOTAL_DOCTORS || 0, icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.503 4.045 3 5.5L12 21l7-7Z" /><path d="M12 5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" /><path d="M9 3v2" /><path d="M15 3v2" /><path d="M12 14v4" /><path d="M10 16h4" /></svg>
      ), color: 'blue', badge: '+4%', badgeColor: 'green'
    },
    {
      label: 'Total Patients', value: dashboardStats.TOTAL_PATIENTS || 0, icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      ), color: 'purple', badge: '+12%', badgeColor: 'green'
    },
    {
      label: 'Active Appointments', value: dashboardStats.ACTIVE_APPOINTMENTS || 0, icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
      ), color: 'amber', badge: 'Busy', badgeColor: 'orange'
    },
  ] : stats.slice(0, 3);

  return (
    <div className="admin-layout">
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
            <button
              key={item.label}
              className={`sidebar-nav-item ${activeNav === item.label ? 'active' : ''}`}
              onClick={() => {
                if (item.label === 'Schedules') {
                  openSchedules();
                } else if (item.label === 'Patients') {
                  setActiveNav('Patients');
                  fetchPatients();
                } else if (item.label === 'Appointments') {
                  setActiveNav('Appointments');
                  fetchAppointments();
                } else {
                  setActiveNav(item.label);
                }
              }}
            >
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
            <input type="text" placeholder="Search staff, patients, records..." />
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              <span className="notif-dot"></span>
            </button>
            <div className="topbar-divider"></div>
            <div className="user-profile">
              <div className="topbar-avatar">AD</div>
              <div className="user-info">
                <span className="user-name">Admin User</span>
                <span className="user-role">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">
          {activeNav === 'Schedules' ? (
            <>
              <div className="page-title-row">
                <div className="page-title">
                  <h1>Doctor Schedules</h1>
                  <p>Set the weekly come-in time for each doctor. Bookings outside these hours are blocked.</p>
                </div>
              </div>

              <div className="table-card" style={{ padding: '24px' }}>
                {scheduleMsg.text && <div className={`alert alert-${scheduleMsg.type}`} style={{ marginBottom: '16px' }}>{scheduleMsg.text}</div>}

                <div className="form-field" style={{ maxWidth: '420px', marginBottom: '24px' }}>
                  <label>Select Doctor</label>
                  <select value={scheduleDoctorId} onChange={e => loadDoctorSchedule(e.target.value)}>
                    <option value="">-- Choose a doctor --</option>
                    {scheduleDoctors.map(d => (
                      <option key={d.DOCTOR_ID} value={d.DOCTOR_ID}>Dr. {d.NAME} {d.SPECIALIST_AREA ? `(${d.SPECIALIST_AREA})` : ''}</option>
                    ))}
                  </select>
                </div>

                {scheduleDoctorId && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', padding: '14px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px' }}>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label>Apply to all days — Start</label>
                        <input type="time" value={bulkTime.startTime} onChange={e => setBulkTime({ ...bulkTime, startTime: e.target.value })} />
                      </div>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label>End</label>
                        <input type="time" value={bulkTime.endTime} onChange={e => setBulkTime({ ...bulkTime, endTime: e.target.value })} />
                      </div>
                      <button type="button" className="btn-secondary-action" onClick={applyBulkTime}>Apply to all 7 days</button>
                    </div>

                    <table className="staff-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Working?</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleDays.map(d => (
                          <tr key={d.day}>
                            <td style={{ fontWeight: 600 }}>{DAY_LABELS[d.day]}</td>
                            <td>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={!d.off}
                                  onChange={e => updateScheduleDay(d.day, { off: !e.target.checked })}
                                />
                                <span>{d.off ? 'Day off' : 'Working'}</span>
                              </label>
                            </td>
                            <td>
                              <input type="time" disabled={d.off} value={d.startTime || ''} onChange={e => updateScheduleDay(d.day, { startTime: e.target.value })} />
                            </td>
                            <td>
                              <input type="time" disabled={d.off} value={d.endTime || ''} onChange={e => updateScheduleDay(d.day, { endTime: e.target.value })} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button type="button" className="btn-primary-add" onClick={saveSchedule} disabled={scheduleSaving}>
                        {scheduleSaving ? 'Saving...' : 'Save Schedule'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : activeNav === 'Patients' ? (
            <>
              <div className="page-title-row">
                <div className="page-title">
                  <h1>Patient Registry</h1>
                  <p>Overview of all registered patients in the hospital.</p>
                </div>
              </div>
              <div className="table-card">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Disease</th>
                      <th>Doctor Assigned</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.length > 0 ? patients.map(p => (
                      <tr key={p.PATIENT_ID}>
                        <td>#{p.PATIENT_ID}</td>
                        <td style={{fontWeight: 600}}>{p.NAME}</td>
                        <td>{p.DISEASE || 'N/A'}</td>
                        <td>{p.DOCTOR_NAME ? `Dr. ${p.DOCTOR_NAME}` : 'Unassigned'}</td>
                        <td>{p.PHONE_NUMBER || p.EMAIL || 'N/A'}</td>
                      </tr>
                    )) : <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No patients found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : activeNav === 'Appointments' ? (
            <>
              <div className="page-title-row">
                <div className="page-title">
                  <h1>Hospital Appointments</h1>
                  <p>View all scheduled appointments and their statuses.</p>
                </div>
              </div>
              <div className="table-card">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length > 0 ? appointments.map((a, i) => (
                      <tr key={i}>
                        <td>{new Date(a.APPOINTMENT_DATE).toLocaleString()}</td>
                        <td style={{fontWeight: 600}}>{a.PATIENT_NAME}</td>
                        <td>Dr. {a.DOCTOR_NAME}</td>
                        <td><span className={`status-badge ${a.STATUS === 'Scheduled' || a.STATUS === 'Completed' ? 'active' : 'deactivated'}`}>{a.STATUS}</span></td>
                        <td><span className={`status-badge ${a.PAYMENT_STATUS === 'Paid' ? 'active' : 'deactivated'}`}>{a.PAYMENT_STATUS}</span></td>
                      </tr>
                    )) : <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No appointments found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
          <>
          <div className="page-title-row">
            <div className="page-title">
              <h1>Staff Management</h1>
              <p>Oversee hospital personnel and administration roles.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary-action" onClick={openAllocateModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="16" x2="22" y1="11" y2="11" /></svg>
                Allocate Duty
              </button>
              <button className="btn-primary-add" onClick={() => { setShowModal(true); setMessage({ type: '', text: '' }); }}>
                ＋ Add New Staff Member
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stat-cards">
            {dynamicStats.map((card, idx) => (
              <div className="stat-card" key={idx}>
                <div className={`stat-icon ${card.color}`}>{card.icon}</div>
                <div className="stat-info">
                  <div className="stat-label">{card.label}</div>
                  <div className="stat-value">{card.value}</div>
                </div>
                <span className={`stat-badge ${card.badgeColor}`}>{card.badge}</span>
              </div>
            ))}
          </div>

          <div className="content-grid">
            {/* Table Panel */}
            <div className="table-card">
              <div className="table-card-header">
                <h2>Staff Overview</h2>
                <div className="table-card-controls">
                  <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="doctor">Doctors</option>
                    <option value="nurse">Nurses</option>
                    <option value="pharmacist">Pharmacists</option>
                    <option value="reception">Receptionists</option>
                    <option value="admin">Admins</option>
                  </select>
                  <button className="filter-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9v6l4 3v-9L22 3z" /></svg>
                  </button>
                </div>
              </div>

              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Name &amp; Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length > 0 ? filteredStaff.map(s => (
                    <tr key={s.USER_ID || s.ID}>
                      <td>
                        <div className="staff-user">
                          <div className="staff-avatar av-blue">
                            {s.FULL_NAME ? s.FULL_NAME.substring(0, 2).toUpperCase() : '??'}
                          </div>
                          <div>
                            <div className="staff-name">{s.FULL_NAME}</div>
                            <div className="staff-role" style={{ textTransform: 'capitalize' }}>{s.ROLE || filterDept}</div>
                          </div>
                        </div>
                      </td>
                      <td>{s.SPECIALIST_AREA || s.ALLOCATED_WARD || '—'} {s.ROLE === 'doctor' && s.CONSULTATION_FEE !== undefined && `(Rs ${s.CONSULTATION_FEE})`}</td>
                      <td>
                        <span className={`status-badge ${s.IS_ACTIVE === 1 || s.IS_ACTIVE === undefined ? 'active' : 'deactivated'}`}>
                          {s.IS_ACTIVE === 1 || s.IS_ACTIVE === undefined ? 'ACTIVE' : 'DEACTIVATED'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="action-link edit" onClick={() => {
                            if (s.ROLE === 'doctor' || s.ROLE === undefined && s.SPECIALIST_AREA) {
                              setFeeData({ doctorId: s.USER_ID || s.ID, name: s.FULL_NAME, consultationFee: s.CONSULTATION_FEE || 0, hospitalCharge: s.HOSPITAL_CHARGE || 500 });
                              setShowFeeModal(true);
                            }
                          }}>{s.ROLE === 'doctor' || (s.ROLE === undefined && s.SPECIALIST_AREA) ? 'Set Fee' : 'Edit'}</button>
                          <button className={`action-link ${s.IS_ACTIVE === 1 ? 'deactivate' : 'activate'}`}>
                            {s.IS_ACTIVE === 1 ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No staff records found.</td></tr>
                  )}
                </tbody>
              </table>

              <div className="table-footer">
                <span>Total {filteredStaff.length} staff members found</span>
              </div>
            </div>

          </div>
          </>
          )}
        </main>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Staff Member</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form className="modal-form" onSubmit={handleSubmit}>
                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                <div className="modal-form-row">
                  <div className="form-field full-width" style={{ flex: 1 }}>
                    <label>Role</label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} required>
                      {[
                        { val: 'admin', label: 'Admin' },
                        { val: 'doctor', label: 'Doctor' },
                        { val: 'nurse', label: 'Nurse' },
                        { val: 'reception', label: 'Receptionist' },
                        { val: 'pharmacist', label: 'Pharmacist' },
                        { val: 'patient', label: 'Patient' }
                      ].map(r => (
                        <option key={r.val} value={r.val}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Dr. John Smith" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
                </div>

                <div className="modal-form-row">
                  <div className="form-field">
                    <label>Email Address</label>
                    <input type="email" placeholder="name@carepulse.local" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="form-field">
                    <label>Password</label>
                    <input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
                  </div>
                </div>

                {(formData.role === 'doctor' || formData.role === 'nurse') && (
                  <>
                    <div className="modal-form-row">
                      <div className="form-field">
                        <label>Mobile Number</label>
                        <input type="text" placeholder="e.g. 0712345678" value={formData.mobileNumber} onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} required />
                      </div>
                      <div className="form-field">
                        <label>License Number</label>
                        <input type="text" placeholder="e.g. RN12345" value={formData.licenseNumber} onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} required />
                      </div>
                    </div>


                    <div className="modal-form-row">
                      <div className="form-field">
                        <label>Address</label>
                        <input type="text" placeholder="e.g. 123 Main St" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
                      </div>
                      {formData.role === 'doctor' ? (
                        <div className="form-field">
                          <label>Specialist Area</label>
                          <input type="text" placeholder="e.g. Cardiology" value={formData.specialistArea} onChange={e => setFormData({ ...formData, specialistArea: e.target.value })} required />
                        </div>
                      ) : (
                        <div className="form-field">
                          <label>Allocated Ward</label>
                          <input type="text" placeholder="e.g. ICU" value={formData.allocatedWard || ''} onChange={e => setFormData({ ...formData, allocatedWard: e.target.value })} required />
                        </div>
                      )}
                    </div>

                    {formData.role === 'doctor' && (
                      <div className="modal-form-row">
                        <div className="form-field" style={{ flex: 1 }}>
                          <label>Consultation Fee (Rs.)</label>
                          <input type="number" placeholder="e.g. 1500" value={formData.consultationFee} onChange={e => setFormData({ ...formData, consultationFee: e.target.value })} />
                        </div>
                        <div className="form-field" style={{ flex: 1 }}>
                          <label>Hospital Charge (Rs.)</label>
                          <input type="number" placeholder="e.g. 500" value={formData.hospitalCharge} onChange={e => setFormData({ ...formData, hospitalCharge: e.target.value })} />
                        </div>
                      </div>
                    )}

                    {formData.role === 'doctor' && (
                      <div className="modal-form-row">
                        <div className="form-field" style={{ flex: 1 }}>
                          <label>Weekly Come-in Time — Start</label>
                          <input type="time" value={formData.weeklyStartTime} onChange={e => setFormData({ ...formData, weeklyStartTime: e.target.value })} />
                        </div>
                        <div className="form-field" style={{ flex: 1 }}>
                          <label>End (applies to all 7 days)</label>
                          <input type="time" value={formData.weeklyEndTime} onChange={e => setFormData({ ...formData, weeklyEndTime: e.target.value })} />
                        </div>
                      </div>
                    )}

                    {formData.role === 'doctor' && (
                      <div className="form-field">
                        <label>Allocate Nurses</label>
                        <div className="nurse-select-grid" style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: '12px',
                          maxHeight: '220px',
                          overflowY: 'auto',
                          padding: '4px'
                        }}>
                          {availableNurses.map(nurse => {
                            const isSelected = (formData.nurses || []).includes(nurse.NURSE_ID);
                            return (
                              <div key={nurse.NURSE_ID} onClick={() => handleNurseToggle(nurse.NURSE_ID)}
                                style={{
                                  border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  transition: 'all 0.2s',
                                  boxShadow: isSelected ? '0 2px 4px rgba(59, 130, 246, 0.1)' : 'none'
                                }}>
                                <div style={{
                                  width: '20px', height: '20px', borderRadius: '4px',
                                  border: `1.5px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                                  backgroundColor: isSelected ? '#3b82f6' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nurse.NAME}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>{nurse.ALLOCATED_WARD || 'General Ward'}</div>
                                </div>
                              </div>
                            );
                          })}
                          {availableNurses.length === 0 && <span style={{ color: '#64748b', fontStyle: 'italic', padding: '10px' }}>No nurses available.</span>}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="modal-actions" style={{ padding: 0, border: 'none', marginTop: '8px' }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Registering...' : 'Register Staff'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Duty Modal */}
      {showAllocateModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div>
                <h2>Allocate Duty</h2>
                <p>Assign a nurse to a doctor, ward, and shift.</p>
              </div>
              <button className="modal-close" onClick={() => setShowAllocateModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {message.text && (
                <div className={`status-msg ${message.type}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleAllocateDuty}>
                <div className="form-group" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                  <button type="button"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--nurse-primary)', background: allocateType === 'doctor' ? 'var(--nurse-primary)' : 'transparent', color: allocateType === 'doctor' ? 'white' : 'var(--nurse-primary)', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => setAllocateType('doctor')}>
                    Assign to Doctor
                  </button>
                  <button type="button"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--nurse-primary)', background: allocateType === 'ward' ? 'var(--nurse-primary)' : 'transparent', color: allocateType === 'ward' ? 'white' : 'var(--nurse-primary)', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => setAllocateType('ward')}>
                    Assign to Ward
                  </button>
                </div>

                <div className="form-group">
                  <label>Select Nurse</label>
                  <select required value={allocateData.nurseId} onChange={e => setAllocateData({ ...allocateData, nurseId: e.target.value })}>
                    <option value="">-- Choose a Nurse --</option>
                    {adminNurses.map(n => (
                      <option key={n.NURSE_ID} value={n.NURSE_ID}>{n.NAME} (Ward: {n.ALLOCATED_WARD || 'None'})</option>
                    ))}
                  </select>
                </div>

                {allocateType === 'doctor' ? (
                  <div className="form-group">
                    <label>Select Doctor</label>
                    <select required value={allocateData.doctorId} onChange={e => setAllocateData({ ...allocateData, doctorId: e.target.value })}>
                      <option value="">-- Choose a Doctor --</option>
                      {adminDoctors.map(d => (
                        <option key={d.DOCTOR_ID} value={d.DOCTOR_ID}>Dr. {d.NAME} ({d.SPECIALIST_AREA})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Select Ward</label>
                    <select required value={allocateData.allocatedWard} onChange={e => setAllocateData({ ...allocateData, allocatedWard: e.target.value })}>
                      <option value="">-- Choose a Ward --</option>
                      <option value="Ward A">Ward A</option>
                      <option value="Ward B">Ward B</option>
                      <option value="ICU">ICU</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Pediatrics">Pediatrics</option>
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Allocation Date</label>
                    <input type="date" required value={allocateData.allocationDate} onChange={e => setAllocateData({ ...allocateData, allocationDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Shift Time</label>
                    <select required value={allocateData.shiftTime} onChange={e => setAllocateData({ ...allocateData, shiftTime: e.target.value })}>
                      <option value="">- Select -</option>
                      <option value="Morning Shift">Morning (08:00 - 16:00)</option>
                      <option value="Evening Shift">Evening (16:00 - 00:00)</option>
                      <option value="Night Shift">Night (00:00 - 08:00)</option>
                      <option value="Full Day">Full Day</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '2rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAllocateModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Set Fee Modal */}
      {showFeeModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div>
                <h2>Set Doctor Fee</h2>
                <p>Update consultation fee for {feeData.name}.</p>
              </div>
              <button className="modal-close" onClick={() => setShowFeeModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                  await axios.put(`${API_URL}/admin/doctors/${feeData.doctorId}/fee`, { consultationFee: feeData.consultationFee, hospitalCharge: feeData.hospitalCharge }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                  });
                  setShowFeeModal(false);

                  // Simple state update instead of refresh
                  setStaffList(prev => prev.map(s => {
                    if (s.USER_ID === feeData.doctorId || s.ID === feeData.doctorId) {
                      return { ...s, CONSULTATION_FEE: feeData.consultationFee, HOSPITAL_CHARGE: feeData.hospitalCharge };
                    }
                    return s;
                  }));
                } catch (err) {
                  console.error('Failed to update fee', err);
                } finally {
                  setLoading(false);
                }
              }}>
                <div className="form-group">
                  <label>Consultation Fee (Rs.)</label>
                  <input type="number" required value={feeData.consultationFee} onChange={e => setFeeData({ ...feeData, consultationFee: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Hospital Charge (Rs.)</label>
                  <input type="number" required value={feeData.hospitalCharge} onChange={e => setFeeData({ ...feeData, hospitalCharge: e.target.value })} />
                </div>
                <div className="modal-footer" style={{ marginTop: '2rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowFeeModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Fee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
