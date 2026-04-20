import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import { mockUser, mockReport } from '../../tests/mocks/handlers'
import NewReportPage from './NewReportPage'

// t('report.rawInput') = "Arbeitstag beschreiben"
// t('report.generate') = "Bericht generieren"
// t('report.save') = "Bericht speichern"
// t('report.generating') = "Bericht wird erstellt..."
// t('report.generateError') = "Bericht konnte nicht erstellt werden. Bitte erneut versuchen."

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  })
})

describe('NewReportPage', () => {
  describe('GIVEN an authenticated worker', () => {
    describe('WHEN the page loads', () => {
      it('SHOULD render a raw input textarea and generate button', () => {
        renderWithProviders(<NewReportPage />)

        expect(screen.getByRole('textbox', { name: /rawInput|Arbeitstag beschreiben/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^generate$|Bericht generieren/i })).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN a worker types raw input', () => {
    describe('WHEN clicks generate', () => {
      it('SHOULD call POST /ai/generate/ and show a loading indicator', async () => {
        let resolveRequest!: () => void
        server.use(
          http.post('*/ai/generate/', () =>
            new Promise<Response>((resolve) => {
              resolveRequest = () =>
                resolve(HttpResponse.json({ report: mockReport }, { status: 201 }) as unknown as Response)
            })
          )
        )

        const user = userEvent.setup()
        renderWithProviders(<NewReportPage />)

        await user.type(
          screen.getByRole('textbox', { name: /rawInput|Arbeitstag beschreiben/i }),
          'Heute Leitungen verlegt'
        )
        await user.click(screen.getByRole('button', { name: /^generate$|Bericht generieren/i }))

        // The generate button is replaced by a spinner + text while pending
        await waitFor(() => {
          // t('report.generating') = "Bericht wird erstellt..."
          expect(screen.getByText(/generating|Bericht wird erstellt/i)).toBeInTheDocument()
        })

        resolveRequest()
      })
    })
  })

  describe('GIVEN a successful AI response', () => {
    describe('WHEN generation completes', () => {
      it('SHOULD render GeneratedPreview component with a save button', async () => {
        const user = userEvent.setup()
        renderWithProviders(<NewReportPage />)

        await user.type(
          screen.getByRole('textbox', { name: /rawInput|Arbeitstag beschreiben/i }),
          'Heute Leitungen verlegt'
        )
        await user.click(screen.getByRole('button', { name: /^generate$|Bericht generieren/i }))

        await waitFor(() => {
          // t('report.save') = "Bericht speichern"
          expect(screen.getByRole('button', { name: /Bericht speichern/i })).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN AI returns 422', () => {
    describe('WHEN generation fails', () => {
      it('SHOULD show a German error banner', async () => {
        server.use(
          http.post('*/ai/generate/', () =>
            HttpResponse.json({ detail: 'Parse error' }, { status: 422 })
          )
        )

        const user = userEvent.setup()
        renderWithProviders(<NewReportPage />)

        await user.type(
          screen.getByRole('textbox', { name: /rawInput|Arbeitstag beschreiben/i }),
          'Fehlerhafte Eingabe'
        )
        await user.click(screen.getByRole('button', { name: /^generate$|Bericht generieren/i }))

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN GeneratedPreview is shown', () => {
    describe('WHEN clicks save', () => {
      it('SHOULD navigate away from NewReportPage after save', async () => {
        const user = userEvent.setup()
        renderWithProviders(<NewReportPage />)

        await user.type(
          screen.getByRole('textbox', { name: /rawInput|Arbeitstag beschreiben/i }),
          'Heute Leitungen verlegt'
        )
        await user.click(screen.getByRole('button', { name: /^generate$|Bericht generieren/i }))

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /Bericht speichern/i })).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /Bericht speichern/i }))

        // After navigation the preview unmounts and the save button disappears
        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /Bericht speichern/i })).not.toBeInTheDocument()
        })
      })
    })
  })
})
