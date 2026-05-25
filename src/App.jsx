import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Companies from './pages/Companies'
import Company from './pages/Company'
import NewAudit from './pages/NewAudit'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/companies"
            element={
              <PrivateRoute>
                <Companies />
              </PrivateRoute>
            }
          />
          <Route
            path="/companies/:companyId"
            element={
              <PrivateRoute>
                <Company />
              </PrivateRoute>
            }
          />
          <Route
            path="/audit/new"
            element={
              <PrivateRoute>
                <NewAudit />
              </PrivateRoute>
            }
          />
          <Route
            path="/audit/:auditId/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/audit/:auditId/reports"
            element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  )
}