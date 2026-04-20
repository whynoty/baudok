import apiClient from './client'
import type { User, Company, AdminStats, UserRole, Language } from './types'

export interface CreateUserData {
  email: string
  first_name: string
  last_name: string
  role: UserRole
  trade: string
  phone: string
  preferred_language?: Language
}

export interface UpdateUserData {
  first_name?: string
  last_name?: string
  role?: UserRole
  trade?: string
  phone?: string
  is_active?: boolean
  preferred_language?: Language
}

export const adminApi = {
  listUsers: () => apiClient.get<User[]>('/admin-panel/users/'),
  createUser: (data: CreateUserData) =>
    apiClient.post<User>('/admin-panel/users/', data),
  updateUser: (id: string, data: UpdateUserData) =>
    apiClient.patch<User>(`/admin-panel/users/${id}/`, data),
  deleteUser: (id: string) => apiClient.delete(`/admin-panel/users/${id}/`),
  getCompany: () => apiClient.get<Company>('/admin-panel/company/'),
  updateCompany: (data: Partial<Omit<Company, 'id' | 'slug' | 'logo'>>) =>
    apiClient.patch<Company>('/admin-panel/company/', data),
  getStats: () => apiClient.get<AdminStats>('/admin-panel/stats/'),
}
