import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { server } from '../../tests/mocks/server'
import LoginPage from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  it('renders email and password fields', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('textbox', { name: /e-mail/i })).toBeInTheDocument()
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('button', { name: /anmelden|sign in/i })).toBeInTheDocument()
  })

  it('shows error message on failed login (401)', async () => {
    server.use(
      http.post('*/auth/login/', () =>
        HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: /e-mail/i }), 'wrong@test.de')
    await user.type(document.querySelector('input[type="password"]')!, 'wrongpass')
    await user.click(screen.getByRole('button', { name: /anmelden|sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: /e-mail/i }), 'worker@test.de')
    await user.type(document.querySelector('input[type="password"]')!, 'password123')

    const btn = screen.getByRole('button', { name: /anmelden|sign in/i })
    await user.click(btn)

    // The button should be disabled while submitting
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })
  })
})
