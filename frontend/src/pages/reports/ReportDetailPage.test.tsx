import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'
import { mockUser, mockReport } from '../../tests/mocks/handlers'
import { server } from '../../tests/mocks/server'
import i18n from '../../i18n/index'
import ReportDetailPage from './ReportDetailPage'
import type { ReportPhoto } from '../../api/types'

const createMockPhoto = (overrides: Partial<ReportPhoto> = {}): ReportPhoto => ({
  id: 'photo-uuid-1',
  image: '/media/reports/photos/2026/04/test.jpg',
  image_url: 'http://localhost:8000/media/reports/photos/2026/04/test.jpg',
  caption: 'Baustelle EG',
  taken_at: '2026-04-21T10:30:00Z',
  latitude: '52.520008',
  longitude: '13.404954',
  position: 0,
  created_at: '2026-04-21T17:00:00Z',
  ...overrides,
})

const supervisorUser = { ...mockUser, id: 'supervisor-uuid-1', role: 'supervisor' as const }
const workerOtherUser = { ...mockUser, id: 'worker-other-uuid', role: 'worker' as const }

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

  // --- Photo feature tests (tests 6-10) ---

  describe('GIVEN report has photos AND current user is owner', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show PhotoUploader with dropzone', async () => {
        const photo = createMockPhoto()
        const reportWithPhoto = { ...mockReport, photos: [photo] }

        server.use(
          http.get('*/reports/:id/', () => HttpResponse.json(reportWithPhoto))
        )

        // mockUser.id === mockReport.created_by.id — owner match
        useAuthStore.setState({
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderDetailPage()

        await waitFor(() => {
          // Dropzone has role="button" and is only rendered for canEditPhotos
          expect(screen.getByRole('button', { name: /foto|dropzone|hinzufügen|photo/i })).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN report has photos AND current user is supervisor', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show PhotoUploader with dropzone', async () => {
        const photo = createMockPhoto()
        const reportWithPhoto = { ...mockReport, photos: [photo] }

        server.use(
          http.get('*/reports/:id/', () => HttpResponse.json(reportWithPhoto))
        )

        useAuthStore.setState({
          user: supervisorUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderDetailPage()

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /foto|dropzone|hinzufügen|photo/i })).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN report has photos AND current user is worker (not owner)', () => {
    describe('WHEN rendered', () => {
      it('SHOULD NOT show dropzone', async () => {
        const photo = createMockPhoto()
        // report.created_by.id is 'user-uuid-1'; workerOtherUser.id is 'worker-other-uuid'
        const reportWithPhoto = { ...mockReport, photos: [photo] }

        server.use(
          http.get('*/reports/:id/', () => HttpResponse.json(reportWithPhoto))
        )

        useAuthStore.setState({
          user: workerOtherUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderDetailPage()

        await waitFor(() => {
          expect(screen.getByText(mockReport.report_date)).toBeInTheDocument()
        })

        // Worker who is not owner gets PhotoGrid (read-only), no dropzone button
        expect(
          screen.queryByRole('button', { name: /foto|dropzone|hinzufügen|photo/i })
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('GIVEN report.photos is empty array', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show photos empty-state text', async () => {
        const reportNoPhotos = { ...mockReport, photos: [] }

        server.use(
          http.get('*/reports/:id/', () => HttpResponse.json(reportNoPhotos))
        )

        // Non-owner worker sees PhotoGrid which renders empty-state
        useAuthStore.setState({
          user: workerOtherUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderDetailPage()

        await waitFor(() => {
          // t('report.photos.empty')
          expect(screen.getByText(/empty|keine fotos|no photo/i)).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN report has 2 photos', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show count badge with "2"', async () => {
        const reportWith2Photos = {
          ...mockReport,
          photos: [
            createMockPhoto({ id: 'p1', position: 0 }),
            createMockPhoto({ id: 'p2', position: 1 }),
          ],
        }

        server.use(
          http.get('*/reports/:id/', () => HttpResponse.json(reportWith2Photos))
        )

        useAuthStore.setState({
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderDetailPage()

        await waitFor(() => {
          // The badge renders effectivePhotos.length as text inside a <span>
          expect(screen.getByText('2')).toBeInTheDocument()
        })
      })
    })
  })
})
