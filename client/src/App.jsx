import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import DoctorDashboard from './pages/dashboards/DoctorDashboard'
import NurseDashboard from './pages/dashboards/NurseDashboard'
import ReceptionDashboard from './pages/dashboards/ReceptionDashboard'
import PharmacistDashboard from './pages/dashboards/PharmacistDashboard'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
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
  }

  return <Navigate to={roleRoutes[user.role] || '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/nurse" element={<ProtectedRoute><NurseDashboard /></ProtectedRoute>} />
        <Route path="/reception" element={<ProtectedRoute><ReceptionDashboard /></ProtectedRoute>} />
        <Route path="/pharmacist" element={<ProtectedRoute><PharmacistDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
