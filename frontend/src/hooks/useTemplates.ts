import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '../api/templates'

export function useTemplates(trade?: string) {
  return useQuery({
    queryKey: ['templates', trade],
    queryFn: () => templatesApi.list(trade).then((r) => r.data.results),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: templatesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof templatesApi.update>[1]
    }) => templatesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useUseTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templatesApi.use(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useSaveAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      reportId,
      name,
      description,
      isCompanyWide,
    }: {
      reportId: string
      name: string
      description?: string
      isCompanyWide: boolean
    }) => templatesApi.fromReport(reportId, name, description, isCompanyWide),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}
