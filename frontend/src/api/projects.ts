import apiClient from './client'
import type { Project, PaginatedResponse } from './types'

export const projectsApi = {
  list: (params?: { page?: number; is_active?: boolean }) =>
    apiClient.get<PaginatedResponse<Project>>('/projects/', { params }),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}/`),
  create: (data: Omit<Project, 'id'>) =>
    apiClient.post<Project>('/projects/', data),
  update: (id: string, data: Partial<Omit<Project, 'id'>>) =>
    apiClient.patch<Project>(`/projects/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/projects/${id}/`),
}
