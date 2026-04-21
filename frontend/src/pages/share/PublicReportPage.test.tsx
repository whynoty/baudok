import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/mocks/server'
import { mockPublicReport } from '../../tests/mocks/handlers'
import PublicReportPage from './PublicReportPage'

function renderPublicPage(token: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/share/${token}`]}>
        <Routes>
          <Route path="/share/:token" element={<PublicReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PublicReportPage', () => {
  describe('GIVEN valid token WHEN page loads', () => {
    it('SHOULD display company name and report date', async () => {
      renderPublicPage('abc123token')

      await waitFor(() => {
        expect(screen.getByText(/Bau GmbH/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/21\.04\.2026/i)).toBeInTheDocument()
      expect(screen.getByText(/Baustelle Nord/i)).toBeInTheDocument()
      expect(screen.getByText(/Leitungen verlegt/i)).toBeInTheDocument()
    })
  })

  describe('GIVEN invalid token (404) WHEN page loads', () => {
    it('SHOULD show invalid link message', async () => {
      server.use(
        http.get('*/public/share/*/', () =>
          HttpResponse.json({ detail: 'Not found' }, { status: 404 })
        )
      )

      renderPublicPage('invalid-token-xyz')

      await waitFor(() => {
        expect(
          screen.getByText(/nicht mehr gültig|deaktiviert/i)
        ).toBeInTheDocument()
      })
    })
  })
})
