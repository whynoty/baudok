import apiClient from './client'
import type { DailyReport, PaginatedResponse, ReportEntry, ReportPhoto } from './types'

export interface ReportFilters {
  page?: number
  project?: string
  status?: string
  date_from?: string
  date_to?: string
  worker?: string
}

export const reportsApi = {
  list: (params?: ReportFilters) =>
    apiClient.get<PaginatedResponse<DailyReport>>('/reports/', { params }),
  get: (id: string) => apiClient.get<DailyReport>(`/reports/${id}/`),
  update: (id: string, data: Partial<DailyReport>) =>
    apiClient.patch<DailyReport>(`/reports/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/reports/${id}/`),
  review: (id: string, notes?: string) =>
    apiClient.post(`/reports/${id}/review/`, { notes }),
  updateEntry: (reportId: string, entryId: string, data: Partial<ReportEntry>) =>
    apiClient.patch<ReportEntry>(`/reports/${reportId}/entries/${entryId}/`, data),
  downloadPdf: (id: string) =>
    apiClient.get(`/reports/${id}/pdf/`, { responseType: 'blob' }),
  exportCsv: (id: string) =>
    apiClient.get(`/reports/${id}/export/csv/`, { responseType: 'blob' }),
  exportExcel: (id: string) =>
    apiClient.get(`/reports/${id}/export/excel/`, { responseType: 'blob' }),
  sendEmail: (id: string, recipient_email: string) =>
    apiClient.post(`/reports/${id}/send-email/`, { recipient_email }),
  bulkExport: (params: ReportFilters & { format: 'csv' | 'excel' }) =>
    apiClient.get('/export/reports/', { params, responseType: 'blob' }),
  listPhotos: (reportId: string) =>
    apiClient.get<ReportPhoto[]>(`/reports/${reportId}/photos/`),
  uploadPhoto: (reportId: string, formData: FormData) =>
    apiClient.post<ReportPhoto>(`/reports/${reportId}/photos/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updatePhoto: (
    reportId: string,
    photoId: string,
    data: { caption?: string; position?: number },
  ) => apiClient.patch<ReportPhoto>(`/reports/${reportId}/photos/${photoId}/`, data),
  deletePhoto: (reportId: string, photoId: string) =>
    apiClient.delete(`/reports/${reportId}/photos/${photoId}/`),
}
