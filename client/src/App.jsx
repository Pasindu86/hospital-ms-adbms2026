import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import PatientRegister from './pages/PatientRegister'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import DoctorDashboard from './pages/dashboards/DoctorDashboard'
import NurseDashboard from './pages/dashboards/NurseDashboard'
import ReceptionDashboard from './pages/dashboards/ReceptionDashboard'
import PharmacyDispense from './pages/dashboards/PharmacyDispense'
import InventoryDashboard from './pages/dashboards/InventoryDashboard'
import PharmacyRestock from './pages/dashboards/PharmacyRestock'
import UserDashboard from './pages/dashboards/UserDashboard'
import UserHome from './pages/dashboards/UserHome'
import BookAppointment from './pages/dashboards/BookAppointment'
import PatientAppointments from './pages/dashboards/PatientAppointments'

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (role) {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.role !== role) {
      return <Navigate to="/dashboard" replace />
    }
  }
  return children
}

function RoleRedirect() {
  const userStr = localStorage.getItem('user')
  if (!userStr) return <Navigate to="/login" replace />

  const user = JSON.parse(userStr)
  const roleRoutes = {
    admin: '/admin',
    doctor: '/doctor',
    nurse: '/nurse',
    reception: '/reception',
    pharmacist: '/pharmacist',
    patient: '/user/home',
  }

  return <Navigate to={roleRoutes[user.role] || '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/patient/login" element={<Navigate to="/login" replace />} />
        <Route path="/patient/register" element={<PatientRegister />} />

        {/* Staff routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/nurse" element={<ProtectedRoute><NurseDashboard /></ProtectedRoute>} />
        <Route path="/reception" element={<ProtectedRoute><ReceptionDashboard /></ProtectedRoute>} />

        <Route path="/pharmacist" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route index element={<InventoryDashboard />} />
          <Route path="inventory" element={<InventoryDashboard />} />
          <Route path="dispense" element={<PharmacyDispense />} />
          <Route path="restock" element={<PharmacyRestock />} />
        </Route>

        {/* Patient portal routes */}
        <Route path="/user" element={<ProtectedRoute role="patient"><UserDashboard /></ProtectedRoute>}>
          <Route index element={<Navigate to="/user/home" replace />} />
          <Route path="home" element={<UserHome />} />
          <Route path="book" element={<BookAppointment />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="create" element={<Navigate to="/user/book" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
