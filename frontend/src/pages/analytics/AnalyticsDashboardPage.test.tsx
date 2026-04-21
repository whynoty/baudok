import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { server } from '../../tests/mocks/server'
import { mockAnalytics } from '../../tests/mocks/handlers'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../api/types'
import AnalyticsDashboardPage from './AnalyticsDashboardPage'

const mockSupervisor: User = {
  id: 'supervisor-uuid-1',
  email: 'supervisor@test.de',
  first_name: 'Maria',
  last_name: 'Weber',
  role: 'supervisor',
  trade: 'Bauleitung',
  preferred_language: 'de',
  phone: '',
  company: { id: 'company-uuid-1', name: 'Test GmbH', slug: 'test-gmbh' },
}

function setupSupervisorAuth() {
  useAuthStore.getState().setAuth(mockSupervisor, 'mock-token', 'mock-refresh')
}

function setupNoAuth() {
  useAuthStore.getState().logout()
}

describe('AnalyticsDashboardPage', () => {
  beforeEach(() => {
    setupNoAuth()
  })

  it('GIVEN supervisor role WHEN page loads SHOULD show submission rate percentage', async () => {
    setupSupervisorAuth()

    renderWithProviders(<AnalyticsDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('90.0%')).toBeInTheDocument()
    })
  })

  it('GIVEN analytics data WHEN page renders SHOULD show all 4 section headings', async () => {
    setupSupervisorAuth()

    renderWithProviders(<AnalyticsDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Berichte pro Tag')).toBeInTheDocument()
      expect(screen.getByText('Stunden pro Projekt')).toBeInTheDocument()
      expect(screen.getByText('Materialeinträge pro Projekt')).toBeInTheDocument()
      expect(screen.getByText('Top Mitarbeiter')).toBeInTheDocument()
    })
  })

  it('GIVEN empty reports_by_day WHEN page renders SHOULD show noData message for that section', async () => {
    setupSupervisorAuth()
    server.use(
      http.get('*/analytics/', () =>
        HttpResponse.json({
          ...mockAnalytics,
          reports_by_day: [],
        })
      )
    )

    renderWithProviders(<AnalyticsDashboardPage />)

    await waitFor(() => {
      // The noData message appears — query by "getAllByText" because it may appear
      // multiple times if other sections also have no data, but at minimum once
      const noDataMessages = screen.getAllByText('Keine Daten für den gewählten Zeitraum.')
      expect(noDataMessages.length).toBeGreaterThanOrEqual(1)
    })

    // Reports per day section should have no bar chart, but heading still present
    expect(screen.getByText('Berichte pro Tag')).toBeInTheDocument()
  })

  it('GIVEN 403 response WHEN page loads SHOULD show noAccess error', async () => {
    setupSupervisorAuth()
    server.use(
      http.get('*/analytics/', () =>
        HttpResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Forbidden' } },
          { status: 403 }
        )
      )
    )

    renderWithProviders(<AnalyticsDashboardPage />)

    await waitFor(() => {
      expect(
        screen.getByRole('alert')
      ).toHaveTextContent('Nur Vorgesetzte und Admins können Auswertungen sehen.')
    })
  })

  it('GIVEN date filter WHEN user selects date_from SHOULD refetch with updated query params', async () => {
    setupSupervisorAuth()
    const user = userEvent.setup()

    let capturedUrl: string | null = null
    server.use(
      http.get('*/analytics/', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(mockAnalytics)
      })
    )

    renderWithProviders(<AnalyticsDashboardPage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('90.0%')).toBeInTheDocument()
    })

    const dateFromInput = screen.getByLabelText('Von')
    await user.clear(dateFromInput)
    await user.type(dateFromInput, '2026-04-01')

    await waitFor(() => {
      expect(capturedUrl).toContain('date_from=2026-04-01')
    })
  })
})
