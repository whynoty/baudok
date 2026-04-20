import apiClient from './client'
import type { User, LoginResponse } from './types'

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login/', { email, password }),
  refresh: (refresh: string) =>
    apiClient.post<{ access: string }>('/auth/refresh/', { refresh }),
  logout: (refresh: string) =>
    apiClient.post('/auth/logout/', { refresh }),
  me: () => apiClient.get<User>('/auth/me/'),
  updateMe: (data: Partial<Pick<User, 'preferred_language' | 'phone' | 'first_name' | 'last_name'>>) =>
    apiClient.patch<User>('/auth/me/', data),
}
