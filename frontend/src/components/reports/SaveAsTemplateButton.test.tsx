import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import { mockUser } from '../../tests/mocks/handlers'
import SaveAsTemplateButton from './SaveAsTemplateButton'

const supervisorUser = { ...mockUser, id: 'supervisor-uuid-1', role: 'supervisor' as const }

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  })
})

describe('SaveAsTemplateButton', () => {
  describe('GIVEN component rendered WHEN button clicked', () => {
    it('SHOULD open modal', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <SaveAsTemplateButton reportId="report-uuid-1" rawInputText="Heute Leitungen verlegt" />
      )

      // t('templates.saveAs') = "Als Vorlage speichern"
      await user.click(screen.getByRole('button', { name: /Als Vorlage speichern/i }))

      // t('templates.saveAsTitle') = "Als Vorlage speichern" (modal title)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        // t('templates.name') = "Vorlagenname"
        expect(screen.getByLabelText(/Vorlagenname/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN form submitted WHEN API succeeds', () => {
    it('SHOULD show success message', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <SaveAsTemplateButton reportId="report-uuid-1" rawInputText="Heute Leitungen verlegt" />
      )

      await user.click(screen.getByRole('button', { name: /Als Vorlage speichern/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/Vorlagenname/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/Vorlagenname/i), 'Meine Vorlage')

      // t('templates.save') = "Speichern"
      await user.click(screen.getByRole('button', { name: /^Speichern$/i }))

      // t('templates.saved') = "Vorlage gespeichert"
      await waitFor(() => {
        expect(screen.getByText(/Vorlage gespeichert/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN worker role WHEN modal open', () => {
    it('SHOULD NOT show company-wide checkbox', async () => {
      useAuthStore.setState({
        user: mockUser, // worker role
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
      })

      const user = userEvent.setup()
      renderWithProviders(
        <SaveAsTemplateButton reportId="report-uuid-1" rawInputText="Heute Leitungen verlegt" />
      )

      await user.click(screen.getByRole('button', { name: /Als Vorlage speichern/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // t('templates.shareWithCompany') = "Mit allen Mitarbeitern teilen"
      expect(
        screen.queryByText(/Mit allen Mitarbeitern teilen/i)
      ).not.toBeInTheDocument()
    })
  })

  describe('GIVEN supervisor role WHEN modal open', () => {
    it('SHOULD show company-wide checkbox', async () => {
      useAuthStore.setState({
        user: supervisorUser,
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
      })

      const user = userEvent.setup()
      renderWithProviders(
        <SaveAsTemplateButton reportId="report-uuid-1" rawInputText="Heute Leitungen verlegt" />
      )

      await user.click(screen.getByRole('button', { name: /Als Vorlage speichern/i }))

      // t('templates.shareWithCompany') = "Mit allen Mitarbeitern teilen"
      await waitFor(() => {
        expect(screen.getByText(/Mit allen Mitarbeitern teilen/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN API returns an error WHEN form submitted', () => {
    it('SHOULD not show success message', async () => {
      server.use(
        http.post('*/templates/from_report/', () =>
          HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        )
      )

      const user = userEvent.setup()
      renderWithProviders(
        <SaveAsTemplateButton reportId="report-uuid-1" rawInputText="Heute Leitungen verlegt" />
      )

      await user.click(screen.getByRole('button', { name: /Als Vorlage speichern/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/Vorlagenname/i)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/Vorlagenname/i), 'Meine Vorlage')
      await user.click(screen.getByRole('button', { name: /^Speichern$/i }))

      // success message should not appear on error
      await waitFor(() => {
        expect(screen.queryByText(/Vorlage gespeichert/i)).not.toBeInTheDocument()
      })
    })
  })
})
