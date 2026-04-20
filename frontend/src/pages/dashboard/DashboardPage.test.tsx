import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import { mockUser, mockReport } from '../../tests/mocks/handlers'
import DashboardPage from './DashboardPage'

const workerUser = mockUser
const supervisorUser = { ...mockUser, id: 'supervisor-uuid-1', role: 'supervisor' as const }

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  })
})

describe('DashboardPage', () => {
  describe('GIVEN an authenticated worker', () => {
    describe('WHEN the dashboard loads', () => {
      it('SHOULD render 3 stat cards', async () => {
        useAuthStore.setState({
          user: workerUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<DashboardPage />)

        // Wait for the reports query to settle, then check stat card labels
        // t('dashboard.reportsToday') = "Berichte heute"
        // t('dashboard.reportsThisWeek') = "Berichte diese Woche"
        // t('dashboard.pendingReview') = "Ausstehende Prüfung"
        await waitFor(() => {
          expect(screen.getByText(/reportsToday|Berichte heute/i)).toBeInTheDocument()
          expect(screen.getByText(/reportsThisWeek|Berichte diese Woche/i)).toBeInTheDocument()
          expect(screen.getByText(/pendingReview|Ausstehende Prüfung/i)).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN a worker with reports', () => {
    describe('WHEN the dashboard loads', () => {
      it('SHOULD render ReportCards from the mock list', async () => {
        useAuthStore.setState({
          user: workerUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<DashboardPage />)

        await waitFor(() => {
          expect(screen.getByText(mockReport.report_date)).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN a supervisor', () => {
    describe('WHEN the dashboard loads', () => {
      it('SHOULD fetch from /admin-panel/stats/ and display total_reports', async () => {
        useAuthStore.setState({
          user: supervisorUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<DashboardPage />)

        // total_reports value from handler is 5
        await waitFor(() => {
          expect(screen.getByText('5')).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN no reports exist', () => {
    describe('WHEN the dashboard loads', () => {
      it('SHOULD show empty state message', async () => {
        server.use(
          http.get('*/reports/', () =>
            HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
          )
        )

        useAuthStore.setState({
          user: workerUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<DashboardPage />)

        await waitFor(() => {
          // t('dashboard.noReports') = "Noch keine Berichte vorhanden."
          expect(screen.getByText(/noReports|Noch keine Berichte/i)).toBeInTheDocument()
        })
      })
    })
  })
})
