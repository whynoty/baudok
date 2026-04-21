import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listShareLinks,
  createShareLink,
  deleteShareLink,
  getPublicReport,
} from '../api/share'

export function useShareLinks(reportId: string) {
  return useQuery({
    queryKey: ['share', reportId],
    queryFn: () => listShareLinks(reportId),
    enabled: Boolean(reportId),
  })
}

export function useCreateShareLink(reportId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ expiresDays, note }: { expiresDays: number; note: string }) =>
      createShareLink(reportId, expiresDays, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['share', reportId] })
    },
  })
}

export function useDeleteShareLink(reportId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => deleteShareLink(reportId, linkId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['share', reportId] })
    },
  })
}

export function usePublicReport(token: string) {
  return useQuery({
    queryKey: ['publicReport', token],
    queryFn: () => getPublicReport(token),
    enabled: Boolean(token),
    retry: false,
  })
}
