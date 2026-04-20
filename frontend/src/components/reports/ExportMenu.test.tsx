import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import { mockUser } from '../../tests/mocks/handlers'
import { ExportMenu } from './ExportMenu'

const REPORT_ID = 'report-uuid-1'

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  })

  // Stub URL.createObjectURL so downloadBlob doesn't throw in jsdom
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
  vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ExportMenu', () => {
  describe('GIVEN ExportMenu', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show an Export button', () => {
        renderWithProviders(<ExportMenu reportId={REPORT_ID} />)
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN clicking the PDF option', () => {
    describe('WHEN the dropdown is open', () => {
      it('SHOULD call the reports PDF endpoint', async () => {
        let pdfCalled = false
        server.use(
          http.get(`*/reports/${REPORT_ID}/pdf/`, () => {
            pdfCalled = true
            return HttpResponse.arrayBuffer(new ArrayBuffer(0), {
              headers: { 'Content-Type': 'application/pdf' },
            })
          })
        )

        const user = userEvent.setup()
        renderWithProviders(<ExportMenu reportId={REPORT_ID} />)

        // Open the dropdown
        await user.click(screen.getByRole('button', { name: /export/i }))

        // Click the PDF option
        // t('report.exportPdf') = "PDF herunterladen"
        const pdfOption = screen.getByText(/exportPdf|PDF herunterladen/i)
        await user.click(pdfOption)

        await waitFor(() => {
          expect(pdfCalled).toBe(true)
        })
      })
    })
  })

  describe('GIVEN clicking the email option', () => {
    describe('WHEN the dropdown is open', () => {
      it('SHOULD open the email modal', async () => {
        const user = userEvent.setup()
        renderWithProviders(<ExportMenu reportId={REPORT_ID} />)

        // Open the dropdown
        await user.click(screen.getByRole('button', { name: /export/i }))

        // Click send email option
        // t('report.sendEmail') = "Per E-Mail senden"
        const emailOption = screen.getByText(/sendEmail|Per E-Mail senden/i)
        await user.click(emailOption)

        await waitFor(() => {
          // t('report.emailRecipient') = "Empfänger E-Mail"
          expect(
            screen.getByRole('textbox', { name: /emailRecipient|Empfänger E-Mail/i })
          ).toBeInTheDocument()
        })
      })
    })
  })
})
