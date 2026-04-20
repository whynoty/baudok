import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface OfflineDraft {
  id: string
  createdAt: string
  reportDate: string
  projectId: string | null
  projectName: string | null
  weather: string
  temperature: number | null
  rawInput: string
  syncStatus: 'pending' | 'syncing' | 'failed'
  failReason?: string
}

interface OfflineState {
  isOnline: boolean
  drafts: OfflineDraft[]
  setOnline: (online: boolean) => void
  addDraft: (draft: Omit<OfflineDraft, 'id' | 'createdAt' | 'syncStatus'>) => string
  updateDraftStatus: (id: string, status: OfflineDraft['syncStatus'], failReason?: string) => void
  removeDraft: (id: string) => void
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      drafts: [],
      setOnline: (isOnline) => set({ isOnline }),
      addDraft: (draftData) => {
        const id = crypto.randomUUID()
        const draft: OfflineDraft = {
          ...draftData,
          id,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
        }
        set((s) => ({ drafts: [...s.drafts, draft] }))
        return id
      },
      updateDraftStatus: (id, syncStatus, failReason) =>
        set((s) => ({
          drafts: s.drafts.map((d) =>
            d.id === id ? { ...d, syncStatus, failReason } : d
          ),
        })),
      removeDraft: (id) =>
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
    }),
    {
      name: 'baudok-offline',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ drafts: s.drafts }),
    }
  )
)
