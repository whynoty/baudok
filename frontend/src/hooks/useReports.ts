import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../api/reports'
import type { ReportFilters } from '../api/reports'
import type { DailyReport } from '../api/types'

export function useReports(params?: ReportFilters) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsApi.list(params).then((r) => r.data),
  })
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useUpdateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DailyReport> }) =>
      reportsApi.update(id, data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.setQueryData(['report', updated.id], updated)
    },
  })
}

export function useDeleteReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}
