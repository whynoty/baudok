import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { server } from '../../tests/mocks/server'
import { mockNotificationPrefs } from '../../tests/mocks/handlers'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../api/types'
import NotificationSettingsPage from './NotificationSettingsPage'

// --- mock data ---------------------------------------------------------------

const mockWorker: User = {
  id: 'user-uuid-worker',
  email: 'worker@test.de',
  first_name: 'Hans',
  last_name: 'Müller',
  role: 'worker',
  trade: 'Elektriker',
  preferred_language: 'de',
  phone: '',
  company: { id: 'company-uuid-1', name: 'Test GmbH', slug: 'test-gmbh' },
}

const mockSupervisor: User = {
  ...mockWorker,
  id: 'user-uuid-supervisor',
  email: 'supervisor@test.de',
  role: 'supervisor',
}

// --- helpers -----------------------------------------------------------------

function setupWorkerAuth() {
  useAuthStore.getState().setAuth(mockWorker, 'mock-token', 'mock-refresh')
}

function setupSupervisorAuth() {
  useAuthStore.getState().setAuth(mockSupervisor, 'mock-token', 'mock-refresh')
}

// Push API is unavailable in jsdom — stub out navigator.serviceWorker and PushManager
// so useNotificationSubscription degrades gracefully (isSupported = false)
function stubNoPushSupport() {
  // Ensure PushManager is not defined in the test window
  vi.stubGlobal('PushManager', undefined)
}

// --- tests -------------------------------------------------------------------

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    setupWorkerAuth()
    stubNoPushSupport()
  })

  it('GIVEN page loads WHEN preferences fetched SHOULD show current toggle states', async () => {
    renderWithProviders(<NotificationSettingsPage />)

    // daily_reminder: true → toggle should be aria-checked=true
    await waitFor(() => {
      const dailyReminderToggle = screen.getByRole('switch', { name: /Tägliche Erinnerung/i })
      expect(dailyReminderToggle).toHaveAttribute('aria-checked', 'true')
    })

    // email_fallback: true → toggle should be aria-checked=true
    const emailFallbackToggle = screen.getByRole('switch', { name: /E-Mail als Backup/i })
    expect(emailFallbackToggle).toHaveAttribute('aria-checked', 'true')
  })

  it('GIVEN push not supported WHEN page renders SHOULD show not-supported message', async () => {
    renderWithProviders(<NotificationSettingsPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Ihr Browser unterstützt keine Push-Benachrichtigungen.')
      ).toBeInTheDocument()
    })
  })

  it('GIVEN supervisor role WHEN page renders SHOULD show supervisor_alerts toggle', async () => {
    setupSupervisorAuth()

    server.use(
      http.get('*/notifications/preferences/', () =>
        HttpResponse.json({ ...mockNotificationPrefs, supervisor_alerts: true })
      )
    )

    renderWithProviders(<NotificationSettingsPage />)

    await waitFor(() => {
      const alertToggle = screen.getByRole('switch', { name: /Alert bei neuem Bericht/i })
      expect(alertToggle).toBeInTheDocument()
      expect(alertToggle).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('GIVEN worker role WHEN page renders SHOULD NOT show supervisor_alerts toggle', async () => {
    setupWorkerAuth()

    renderWithProviders(<NotificationSettingsPage />)

    await waitFor(() => {
      // Wait for prefs to load (daily reminder toggle appears)
      expect(screen.getByRole('switch', { name: /Tägliche Erinnerung/i })).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('switch', { name: /Alert bei neuem Bericht/i })
    ).not.toBeInTheDocument()
  })

  it('GIVEN daily_reminder off WHEN rendered SHOULD hide reminder_time input', async () => {
    server.use(
      http.get('*/notifications/preferences/', () =>
        HttpResponse.json({ ...mockNotificationPrefs, daily_reminder: false })
      )
    )

    renderWithProviders(<NotificationSettingsPage />)

    await waitFor(() => {
      const toggle = screen.getByRole('switch', { name: /Tägliche Erinnerung/i })
      expect(toggle).toHaveAttribute('aria-checked', 'false')
    })

    expect(screen.queryByLabelText(/Erinnerungszeit/i)).not.toBeInTheDocument()
  })

  it('GIVEN daily_reminder on WHEN rendered SHOULD show reminder_time input', async () => {
    renderWithProviders(<NotificationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Erinnerungszeit/i)).toBeInTheDocument()
    })
  })

  it('GIVEN toggle changed WHEN mutation succeeds SHOULD show saved confirmation', async () => {
    const user = userEvent.setup()

    renderWithProviders(<NotificationSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /E-Mail als Backup/i })).toBeInTheDocument()
    })

    const emailToggle = screen.getByRole('switch', { name: /E-Mail als Backup/i })
    await user.click(emailToggle)

    await waitFor(() => {
      expect(screen.getByText('Gespeichert ✓')).toBeVisible()
    })
  })
})
