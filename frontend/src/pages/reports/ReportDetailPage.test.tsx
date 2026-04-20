import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'
import { mockUser, mockReport } from '../../tests/mocks/handlers'
import i18n from '../../i18n/index'
import ReportDetailPage from './ReportDetailPage'

const supervisorUser = { ...mockUser, id: 'supervisor-uuid-1', role: 'supervisor' as const }

function DetailProviders({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[`/reports/${mockReport.id}`]}>
          {children}
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

function renderDetailPage() {
  return render(
    <Routes>
      <Route path="/reports/:id" element={<ReportDetailPage />} />
    </Routes>,
    { wrapper: DetailProviders }
  )
}

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  })
})

describe('ReportDetailPage', () => {
  describe('GIVEN a report with work_performed entries', () => {
    describe('WHEN the detail page loads', () => {
      it('SHOULD render entries under the category heading', async () => {
        renderDetailPage()

        await waitFor(() => {
          expect(screen.getByText(mockReport.entries[0].content)).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN worker role', () => {
    describe('WHEN the detail page loads', () => {
      it('SHOULD NOT render the ReviewPanel approve button', async () => {
        useAuthStore.setState({
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderDetailPage()

        await waitFor(() => {
          expect(screen.getByText(mockReport.report_date)).toBeInTheDocument()
        })

        // t('report.reviewConfirm') = "Bericht freigeben"
        expect(
          screen.queryByRole('button', { name: /reviewConfirm|Bericht freigeben/i })
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('GIVEN supervisor role', () => {
    describe('WHEN the detail page loads', () => {
      it('SHOULD render the ReviewPanel with approve button', async () => {
        useAuthStore.setState({
          user: supervisorUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderDetailPage()

        await waitFor(() => {
          // t('report.reviewConfirm') = "Bericht freigeben"
          expect(
            screen.getByRole('button', { name: /reviewConfirm|Bericht freigeben/i })
          ).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN a report with raw_input_text', () => {
    describe('WHEN clicking the collapsible toggle', () => {
      it('SHOULD show the original input text', async () => {
        const user = userEvent.setup()
        renderDetailPage()

        await waitFor(() => {
          expect(screen.getByText(mockReport.report_date)).toBeInTheDocument()
        })

        // t('report.rawInputLabel') = "Originaleingabe"
        const toggle = screen.getByText(/rawInputLabel|Originaleingabe/i)
        await user.click(toggle)

        await waitFor(() => {
          expect(screen.getByText(mockReport.raw_input_text)).toBeInTheDocument()
        })
      })
    })
  })
})
