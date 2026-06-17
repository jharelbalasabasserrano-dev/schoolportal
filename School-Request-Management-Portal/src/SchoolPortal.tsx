import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ProtectedRoute } from './LoginPage'
import { AuthProvider } from './portalAuth'
import { Dashboard } from './portalViews'

export default function SchoolPortal() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
