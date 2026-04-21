import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listSignatures, createSignature } from '../api/signatures'

export function useSignatures(reportId: string) {
  return useQuery({
    queryKey: ['signatures', reportId],
    queryFn: () => listSignatures(reportId),
    enabled: Boolean(reportId),
  })
}

export function useCreateSignature(reportId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (signatureImage: string) => createSignature(reportId, signatureImage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures', reportId] })
    },
  })
}
