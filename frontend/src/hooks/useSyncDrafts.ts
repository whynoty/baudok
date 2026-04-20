import { useCallback } from 'react'
import { useOfflineStore } from '../store/offlineStore'
import { aiApi } from '../api/ai'
import { useQueryClient } from '@tanstack/react-query'

export function useSyncDrafts() {
  const { drafts, updateDraftStatus, removeDraft } = useOfflineStore()
  const queryClient = useQueryClient()

  const syncAll = useCallback(async () => {
    const pending = drafts.filter((d) => d.syncStatus === 'pending')
    for (const draft of pending) {
      updateDraftStatus(draft.id, 'syncing')
      try {
        await aiApi.generate({
          raw_input: draft.rawInput,
          project_id: draft.projectId ?? undefined,
          report_date: draft.reportDate,
          weather: draft.weather || undefined,
          temperature: draft.temperature ?? undefined,
        })
        removeDraft(draft.id)
        queryClient.invalidateQueries({ queryKey: ['reports'] })
      } catch {
        updateDraftStatus(draft.id, 'failed', 'Synchronisation fehlgeschlagen')
      }
    }
  }, [drafts, updateDraftStatus, removeDraft, queryClient])

  const pendingCount = drafts.filter((d) => d.syncStatus === 'pending').length

  return { syncAll, pendingCount }
}
