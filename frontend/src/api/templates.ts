import apiClient from './client'
import type { ReportTemplate, PaginatedResponse } from './types'

export const templatesApi = {
  list: (trade?: string) =>
    apiClient.get<PaginatedResponse<ReportTemplate>>('/templates/', {
      params: trade ? { trade } : {},
    }),

  get: (id: string) =>
    apiClient.get<ReportTemplate>(`/templates/${id}/`),

  create: (
    data: Pick<
      ReportTemplate,
      'name' | 'trade' | 'description' | 'raw_input_template' | 'is_company_wide'
    >,
  ) => apiClient.post<ReportTemplate>('/templates/', data),

  update: (
    id: string,
    data: Partial<
      Pick<
        ReportTemplate,
        'name' | 'trade' | 'description' | 'raw_input_template' | 'is_company_wide'
      >
    >,
  ) => apiClient.patch<ReportTemplate>(`/templates/${id}/`, data),

  delete: (id: string) => apiClient.delete(`/templates/${id}/`),

  use: (id: string) => apiClient.post<ReportTemplate>(`/templates/${id}/use/`),

  fromReport: (
    reportId: string,
    name?: string,
    description?: string,
    isCompanyWide?: boolean,
  ) =>
    apiClient.post<ReportTemplate>('/templates/from_report/', {
      report_id: reportId,
      name,
      description,
      is_company_wide: isCompanyWide ?? false,
    }),
}
