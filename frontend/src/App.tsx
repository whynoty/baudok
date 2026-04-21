import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Spinner } from './components/ui'
import { AppShell } from './components/layout/AppShell'
import ProtectedRoute from './components/auth/ProtectedRoute'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const NewReportPage = lazy(() => import('./pages/reports/NewReportPage'))
const ReportDetailPage = lazy(() => import('./pages/reports/ReportDetailPage'))
const ReportHistoryPage = lazy(() => import('./pages/reports/ReportHistoryPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const TemplateManagementPage = lazy(() => import('./pages/admin/TemplateManagementPage'))
const AnalyticsDashboardPage = lazy(() => import('./pages/analytics/AnalyticsDashboardPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function PageFallback() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Spinner size={40} />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/reports" element={<ReportHistoryPage />} />
                <Route path="/reports/new" element={<NewReportPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/templates" element={<TemplateManagementPage />} />
                <Route path="/analytics" element={<AnalyticsDashboardPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
