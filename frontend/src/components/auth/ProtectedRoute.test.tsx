import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import ProtectedRoute from './ProtectedRoute'
import { Route, Routes } from 'react-router-dom'

const mockUser = {
  id: '1',
  email: 'test@test.de',
  first_name: 'Hans',
  last_name: 'Test',
  role: 'worker' as const,
  trade: '',
  preferred_language: 'de' as const,
  phone: '',
  company: { id: '1', name: 'Test', slug: 'test' },
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  it('redirects unauthenticated user to /login', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected</div>} />
        </Route>
      </Routes>
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: mockUser,
      accessToken: 'token',
      refreshToken: 'refresh',
    })
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('does not render protected content when unauthenticated', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Secret</div>} />
        </Route>
      </Routes>
    )
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })
})
