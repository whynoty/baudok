import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/mocks/server'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { mockUser, mockMaterialItem } from '../../tests/mocks/handlers'
import CatalogManagementPage from './CatalogManagementPage'
import RoleGuard from '../../components/auth/RoleGuard'

const supervisorUser = { ...mockUser, role: 'supervisor' as const }
const workerUser = { ...mockUser, role: 'worker' as const }

function setAuth(role: 'supervisor' | 'worker' | 'company_admin') {
  const user = role === 'worker' ? workerUser : { ...mockUser, role }
  useAuthStore.setState({
    user,
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    isAuthenticated: true,
  })
}

beforeEach(() => {
  setAuth('supervisor')
})

describe('CatalogManagementPage', () => {
  describe('GIVEN materials exist', () => {
    describe('WHEN page loads', () => {
      it('SHOULD show material names in table', async () => {
        renderWithProviders(<CatalogManagementPage />)

        await waitFor(() => {
          expect(screen.getByText(mockMaterialItem.name)).toBeInTheDocument()
        })
      })

      it('SHOULD show material unit in table', async () => {
        renderWithProviders(<CatalogManagementPage />)

        await waitFor(() => {
          expect(screen.getByText(mockMaterialItem.unit)).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN add material form submitted', () => {
    describe('WHEN POST succeeds', () => {
      it('SHOULD show new item in list after creation', async () => {
        const newMaterial = { ...mockMaterialItem, id: 'mat-uuid-new', name: 'Neues Material' }
        server.use(
          http.post('*/catalog/materials/', () =>
            HttpResponse.json(newMaterial, { status: 201 })
          ),
          http.get('*/catalog/materials/', () =>
            HttpResponse.json([mockMaterialItem, newMaterial])
          )
        )

        const user = userEvent.setup()
        renderWithProviders(<CatalogManagementPage />)

        // Wait for initial load
        await waitFor(() => {
          expect(screen.getByText(mockMaterialItem.name)).toBeInTheDocument()
        })

        // Open modal
        await user.click(screen.getByRole('button', { name: /material hinzufügen/i }))

        // Fill form
        const nameInputs = screen.getAllByRole('textbox')
        // First text input in modal form is the name field
        const nameInput = nameInputs.find(
          (el) => (el as HTMLInputElement).required
        ) as HTMLElement
        await user.type(nameInput, 'Neues Material')

        // Submit
        await user.click(screen.getByRole('button', { name: /speichern/i }))

        await waitFor(() => {
          expect(screen.getByText('Neues Material')).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN delete clicked', () => {
    describe('WHEN confirmed', () => {
      it('SHOULD remove item from list after deletion', async () => {
        server.use(
          http.delete('*/catalog/materials/*/', () => new HttpResponse(null, { status: 204 })),
          // After deletion, list returns empty
          http.get('*/catalog/materials/', () => HttpResponse.json([]))
        )

        const user = userEvent.setup()
        renderWithProviders(<CatalogManagementPage />)

        await waitFor(() => {
          expect(screen.getByText(mockMaterialItem.name)).toBeInTheDocument()
        })

        // Click delete button for the material
        const deleteButtons = screen.getAllByRole('button', { name: /löschen/i })
        await user.click(deleteButtons[0])

        // Confirmation modal appears — click confirm delete
        const confirmDeleteButtons = screen.getAllByRole('button', { name: /löschen/i })
        // The last one is inside the modal
        await user.click(confirmDeleteButtons[confirmDeleteButtons.length - 1])

        await waitFor(() => {
          expect(screen.queryByText(mockMaterialItem.name)).not.toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN CSV file uploaded', () => {
    describe('WHEN import succeeds', () => {
      it('SHOULD show import result message', async () => {
        server.use(
          http.post('*/catalog/materials/import/', () =>
            HttpResponse.json({ created: 2, updated: 1, skipped: 0 })
          )
        )

        const user = userEvent.setup()
        renderWithProviders(<CatalogManagementPage />)

        await waitFor(() => {
          expect(screen.getByText(mockMaterialItem.name)).toBeInTheDocument()
        })

        // Simulate CSV file upload by triggering the hidden input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        const csvFile = new File(['name,unit\nZement,kg'], 'materials.csv', { type: 'text/csv' })

        await user.upload(fileInput, csvFile)

        await waitFor(() => {
          expect(
            screen.getByText(/2.*erstellt.*1.*aktualisiert.*0.*übersprungen/i)
          ).toBeInTheDocument()
        })
      })
    })
  })

  describe('GIVEN worker role', () => {
    describe('WHEN navigating to /admin/catalog', () => {
      it('SHOULD be blocked by RoleGuard — renders nothing for worker', () => {
        setAuth('worker')

        renderWithProviders(
          <RoleGuard roles={['supervisor', 'company_admin']}>
            <CatalogManagementPage />
          </RoleGuard>
        )

        expect(screen.queryByText(/katalog/i)).not.toBeInTheDocument()
      })
    })
  })
})
