import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/mocks/server'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { mockUser, mockMaterialItem } from '../../tests/mocks/handlers'
import { MaterialAutocomplete } from './MaterialAutocomplete'

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    isAuthenticated: true,
  })
})

describe('MaterialAutocomplete', () => {
  describe('GIVEN user types', () => {
    describe('WHEN matches found', () => {
      it('SHOULD show dropdown options', async () => {
        server.use(
          http.get('*/catalog/materials/', () => HttpResponse.json([mockMaterialItem]))
        )

        const onChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
          <MaterialAutocomplete value="" onChange={onChange} placeholder="Material suchen" />
        )

        const input = screen.getByRole('textbox')
        await user.type(input, 'Zem')

        await waitFor(() => {
          expect(screen.getByRole('listbox')).toBeInTheDocument()
        })

        expect(screen.getByText(mockMaterialItem.name)).toBeInTheDocument()
        expect(screen.getByText(mockMaterialItem.unit)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN option selected', () => {
    describe('WHEN clicked', () => {
      it('SHOULD call onChange with item name', async () => {
        server.use(
          http.get('*/catalog/materials/', () => HttpResponse.json([mockMaterialItem]))
        )

        const onChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
          <MaterialAutocomplete value="" onChange={onChange} />
        )

        const input = screen.getByRole('textbox')
        await user.type(input, 'Zem')

        await waitFor(() => {
          expect(screen.getByRole('listbox')).toBeInTheDocument()
        })

        await user.click(screen.getByText(mockMaterialItem.name))

        expect(onChange).toHaveBeenCalledWith(mockMaterialItem.name)
      })
    })
  })

  describe('GIVEN no matches found', () => {
    describe('WHEN user types', () => {
      it('SHOULD not show dropdown', async () => {
        server.use(
          http.get('*/catalog/materials/', () => HttpResponse.json([]))
        )

        const onChange = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
          <MaterialAutocomplete value="" onChange={onChange} />
        )

        const input = screen.getByRole('textbox')
        await user.type(input, 'xyz')

        // Wait for query to settle — no listbox should appear
        await waitFor(() => {
          expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        })
      })
    })
  })
})
