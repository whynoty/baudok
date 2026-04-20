import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import { mockUser } from '../../tests/mocks/handlers'
import ReportHistoryPage from './ReportHistoryPage'

const supervisorUser = { ...mockUser, id: 'supervisor-uuid-1', role: 'supervisor' as const }

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  })
})

describe('ReportHistoryPage', () => {
  describe('GIVEN an authenticated user', () => {
    describe('WHEN history loads', () => {
      it('SHOULD render the filter bar', async () => {
        renderWithProviders(<ReportHistoryPage />)

        await waitFor(() => {
          // Date inputs are part of the filter bar
          expect(document.querySelector('input[type="date"]')).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN supervisor role', () => {
    describe('WHEN history loads', () => {
      it('SHOULD render the worker filter dropdown', async () => {
        useAuthStore.setState({
          user: supervisorUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<ReportHistoryPage />)

        await waitFor(() => {
          // t('history.filterByWorker') = "Nach Mitarbeiter filtern"
          expect(
            screen.getByRole('combobox', { name: /filterByWorker|Nach Mitarbeiter filtern/i })
          ).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN worker role', () => {
    describe('WHEN history loads', () => {
      it('SHOULD NOT render the worker filter dropdown', async () => {
        useAuthStore.setState({
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<ReportHistoryPage />)

        await waitFor(() => {
          expect(document.querySelector('input[type="date"]')).toBeInTheDocument()
        })

        // t('history.filterByWorker') = "Nach Mitarbeiter filtern"
        expect(
          screen.queryByRole('combobox', { name: /filterByWorker|Nach Mitarbeiter filtern/i })
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('GIVEN the API returns empty results', () => {
    describe('WHEN the page loads', () => {
      it('SHOULD show the no results message', async () => {
        server.use(
          http.get('*/reports/', () =>
            HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
          )
        )

        renderWithProviders(<ReportHistoryPage />)

        await waitFor(() => {
          // t('history.noResults') = "Keine Berichte gefunden."
          expect(screen.getByText(/noResults|Keine Berichte gefunden/i)).toBeInTheDocument()
        })
      })
    })
  })
})
