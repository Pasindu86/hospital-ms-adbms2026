import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import DoctorDashboard from './pages/dashboards/DoctorDashboard'
import NurseDashboard from './pages/dashboards/NurseDashboard'
import ReceptionDashboard from './pages/dashboards/ReceptionDashboard'
import PharmacyDispense from './pages/dashboards/PharmacyDispense'
import InventoryDashboard from './pages/dashboards/InventoryDashboard'
import PharmacyRestock from './pages/dashboards/PharmacyRestock'
import PharmacyBilling from './pages/dashboards/PharmacyBilling'

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
        
        {/* Nested Pharmacist Routes */}
        <Route path="/pharmacist" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route index element={<InventoryDashboard />} />
          <Route path="inventory" element={<InventoryDashboard />} />
          <Route path="dispense" element={<PharmacyDispense />} />
          <Route path="billing" element={<PharmacyBilling />} />
          <Route path="restock" element={<PharmacyRestock />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
