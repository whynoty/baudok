import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import { mockUser, mockTemplates } from '../../tests/mocks/handlers'
import TemplatePicker from './TemplatePicker'
import type { ReportTemplate } from '../../api/types'

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  })
})

describe('TemplatePicker', () => {
  describe('GIVEN templates loaded WHEN modal opened', () => {
    it('SHOULD display template names', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(<TemplatePicker onSelect={onSelect} />)

      // t('templates.use') = "Vorlage verwenden"
      await user.click(screen.getByRole('button', { name: /Vorlage verwenden/i }))

      await waitFor(() => {
        expect(screen.getByText('Elektro Standardtag')).toBeInTheDocument()
        expect(screen.getByText('Sanitär Basis')).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN search text entered WHEN filtering', () => {
    it('SHOULD show only matching templates', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(<TemplatePicker onSelect={onSelect} />)

      await user.click(screen.getByRole('button', { name: /Vorlage verwenden/i }))

      await waitFor(() => {
        expect(screen.getByText('Elektro Standardtag')).toBeInTheDocument()
      })

      // t('templates.search') = "Vorlagen durchsuchen..."
      const searchInput = screen.getByPlaceholderText(/Vorlagen durchsuchen/i)
      await user.type(searchInput, 'Elektro')

      await waitFor(() => {
        expect(screen.getByText('Elektro Standardtag')).toBeInTheDocument()
        expect(screen.queryByText('Sanitär Basis')).not.toBeInTheDocument()
      })
    })
  })

  describe('GIVEN no templates exist WHEN modal opened', () => {
    it('SHOULD show empty state message', async () => {
      server.use(
        http.get('*/templates/', () =>
          HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
        )
      )

      const onSelect = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(<TemplatePicker onSelect={onSelect} />)

      await user.click(screen.getByRole('button', { name: /Vorlage verwenden/i }))

      // t('templates.empty') = "Noch keine Vorlagen vorhanden..."
      await waitFor(() => {
        expect(screen.getByText(/Noch keine Vorlagen vorhanden/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN template selected WHEN "Verwenden" clicked', () => {
    it('SHOULD call onSelect with template and close modal', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()
      renderWithProviders(<TemplatePicker onSelect={onSelect} />)

      await user.click(screen.getByRole('button', { name: /Vorlage verwenden/i }))

      await waitFor(() => {
        expect(screen.getByText('Elektro Standardtag')).toBeInTheDocument()
      })

      // click the "Verwenden" button for the first template
      const useButtons = screen.getAllByRole('button', { name: /^Verwenden$/i })
      await user.click(useButtons[0])

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledOnce()
        const calledWith = onSelect.mock.calls[0][0] as ReportTemplate
        // sorted by usage_count desc: tpl-uuid-1 (5 uses) renders first
        expect(calledWith.id).toBe(mockTemplates[0].id)
      })

      // modal should close — template names no longer visible
      await waitFor(() => {
        expect(screen.queryByText('Elektro Standardtag')).not.toBeInTheDocument()
      })
    })
  })
})
