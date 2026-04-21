import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import { mockShareLink } from '../../tests/mocks/handlers'
import ShareLinkManager from './ShareLinkManager'

const supervisorUser = {
  id: 'supervisor-uuid-1',
  email: 'supervisor@test.de',
  first_name: 'Maria',
  last_name: 'Schmidt',
  role: 'supervisor' as const,
  trade: '',
  preferred_language: 'de' as const,
  phone: '',
  company: { id: 'company-uuid-1', name: 'Test GmbH', slug: 'test-gmbh' },
}

beforeEach(() => {
  useAuthStore.setState({
    user: supervisorUser,
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    isAuthenticated: true,
  })
})

describe('ShareLinkManager', () => {
  describe('GIVEN share links exist WHEN component renders', () => {
    it('SHOULD display link URL and access count', async () => {
      renderWithProviders(<ShareLinkManager reportId="report-uuid-1" />)

      await waitFor(() => {
        expect(
          screen.getByText(/abc123token/i)
        ).toBeInTheDocument()
      })

      // access count badge: "5× aufgerufen"
      expect(screen.getByText(/5/)).toBeInTheDocument()
    })
  })

  describe('GIVEN "Link erstellen" clicked WHEN form submitted', () => {
    it('SHOULD call POST and show new link', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ShareLinkManager reportId="report-uuid-1" />)

      await user.click(screen.getByRole('button', { name: /Link erstellen/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/Gültig für/i)).toBeInTheDocument()
      })

      // submit the form with default values
      const submitButtons = screen.getAllByRole('button', { name: /Link erstellen/i })
      // the second one is the submit button inside the form
      await user.click(submitButtons[submitButtons.length - 1])

      await waitFor(() => {
        expect(screen.getByText(/abc123token/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN "Deaktivieren" clicked WHEN confirmed', () => {
    it('SHOULD call DELETE and remove link', async () => {
      let deleteCalled = false
      server.use(
        http.delete('*/reports/*/share/*/', () => {
          deleteCalled = true
          return new HttpResponse(null, { status: 204 })
        }),
        // Return empty list after deletion
        http.get('*/reports/*/share/', () => {
          if (deleteCalled) return HttpResponse.json([])
          return HttpResponse.json([mockShareLink])
        })
      )

      const user = userEvent.setup()
      renderWithProviders(<ShareLinkManager reportId="report-uuid-1" />)

      await waitFor(() => {
        expect(screen.getByText(/abc123token/i)).toBeInTheDocument()
      })

      // First click shows confirmation
      const deactivateButtons = screen.getAllByRole('button', { name: /Deaktivieren/i })
      await user.click(deactivateButtons[0])

      // Confirmation is shown, click the danger confirm button
      await waitFor(() => {
        const confirmButtons = screen.getAllByRole('button', { name: /Deaktivieren/i })
        expect(confirmButtons.length).toBeGreaterThan(0)
      })

      const confirmBtn = screen.getAllByRole('button', { name: /Deaktivieren/i }).find(
        (btn) => btn.closest('[style*="danger"]') !== null || btn.getAttribute('style')?.includes('error')
      ) ?? screen.getAllByRole('button', { name: /Deaktivieren/i })[0]

      await user.click(confirmBtn)

      await waitFor(() => {
        expect(deleteCalled).toBe(true)
      })
    })
  })

  describe('GIVEN no links WHEN component renders', () => {
    it('SHOULD show empty state', async () => {
      server.use(
        http.get('*/reports/*/share/', () => HttpResponse.json([]))
      )

      renderWithProviders(<ShareLinkManager reportId="report-uuid-1" />)

      await waitFor(() => {
        expect(screen.getByText(/Noch keine Links erstellt/i)).toBeInTheDocument()
      })
    })
  })
})
