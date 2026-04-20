import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout: storeLogout, refreshToken } = useAuthStore()

  async function login(email: string, password: string) {
    const { data } = await authApi.login(email, password)
    // Set access token first so the /me/ interceptor can attach it
    useAuthStore.getState().setAccessToken(data.access)
    const { data: userData } = await authApi.me()
    useAuthStore.getState().setAuth(userData, data.access, data.refresh)
    return userData
  }

  async function logout() {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        // ignore logout errors — store is cleared regardless
      }
    }
    storeLogout()
  }

  return { user, isAuthenticated, login, logout }
}
