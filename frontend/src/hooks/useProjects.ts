import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../api/projects'
import type { Project } from '../api/types'

export function useProjects(params?: { page?: number; is_active?: boolean }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.list(params).then((r) => r.data),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Project, 'id'>) =>
      projectsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
