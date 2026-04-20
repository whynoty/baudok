import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'
import { useAuthStore } from '../store/authStore'

// Providers wrapper with QueryClient
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('sets isAuthenticated after login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login('worker@test.de', 'password123')
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().accessToken).toBe('mock-access-token')
    expect(useAuthStore.getState().user?.email).toBe('worker@test.de')
  })

  it('clears state after logout', async () => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'worker@test.de',
        first_name: 'Hans',
        last_name: 'Test',
        role: 'worker',
        trade: '',
        preferred_language: 'de',
        phone: '',
        company: { id: '1', name: 'Test', slug: 'test' },
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.logout()
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
