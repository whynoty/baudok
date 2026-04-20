import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import RoleGuard from './RoleGuard'

const workerUser = {
  id: '1',
  email: 'worker@test.de',
  first_name: 'Hans',
  last_name: 'Test',
  role: 'worker' as const,
  trade: 'Elektriker',
  preferred_language: 'de' as const,
  phone: '',
  company: { id: '1', name: 'Test GmbH', slug: 'test' },
}

const adminUser = { ...workerUser, role: 'company_admin' as const }

describe('RoleGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null, refreshToken: null })
  })

  it('hides children when user role is not in allowed list', () => {
    useAuthStore.setState({ user: workerUser, isAuthenticated: true, accessToken: 'token', refreshToken: 'refresh' })
    renderWithProviders(
      <RoleGuard roles={['company_admin', 'supervisor']}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('shows children when user role is in allowed list', () => {
    useAuthStore.setState({ user: adminUser, isAuthenticated: true, accessToken: 'token', refreshToken: 'refresh' })
    renderWithProviders(
      <RoleGuard roles={['company_admin']}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('shows fallback when user role is not allowed', () => {
    useAuthStore.setState({ user: workerUser, isAuthenticated: true, accessToken: 'token', refreshToken: 'refresh' })
    renderWithProviders(
      <RoleGuard roles={['company_admin']} fallback={<div>Access Denied</div>}>
        <div>Admin Content</div>
      </RoleGuard>
    )
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('hides children when no user is set', () => {
    renderWithProviders(
      <RoleGuard roles={['worker']}>
        <div>Worker Content</div>
      </RoleGuard>
    )
    expect(screen.queryByText('Worker Content')).not.toBeInTheDocument()
  })
})
