import apiClient from './client'
import type { AnalyticsData } from './types'

export interface AnalyticsFilters {
  project?: string
  worker?: string
  date_from?: string
  date_to?: string
}

export async function getAnalytics(filters?: AnalyticsFilters): Promise<AnalyticsData> {
  const params: Record<string, string> = {}
  if (filters?.project) params.project = filters.project
  if (filters?.worker) params.worker = filters.worker
  if (filters?.date_from) params.date_from = filters.date_from
  if (filters?.date_to) params.date_to = filters.date_to

  const response = await apiClient.get<AnalyticsData>('/analytics/', { params })
  return response.data
}
