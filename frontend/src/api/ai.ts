import apiClient from './client'
import type { DailyReport, GenerateReportPayload } from './types'

export const aiApi = {
  generate: (payload: GenerateReportPayload) =>
    apiClient.post<{ report: DailyReport }>('/ai/generate/', payload),
  regenerate: (id: string, raw_input?: string) =>
    apiClient.post<{ report: DailyReport }>(`/ai/regenerate/${id}/`, { raw_input }),
}
