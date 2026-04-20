import { describe, it, expect, beforeEach } from 'vitest'
import { useOfflineStore } from './offlineStore'

describe('offlineStore', () => {
  beforeEach(() => {
    useOfflineStore.setState({ drafts: [], isOnline: true })
  })

  it('GIVEN no drafts WHEN addDraft called SHOULD add draft with pending status', () => {
    const id = useOfflineStore.getState().addDraft({
      reportDate: '2026-04-21',
      projectId: null,
      projectName: null,
      weather: 'sonnig',
      temperature: 18,
      rawInput: 'Test',
    })
    const drafts = useOfflineStore.getState().drafts
    expect(drafts).toHaveLength(1)
    expect(drafts[0].id).toBe(id)
    expect(drafts[0].syncStatus).toBe('pending')
  })

  it('GIVEN pending draft WHEN updateDraftStatus called with failed SHOULD update status', () => {
    const id = useOfflineStore.getState().addDraft({
      reportDate: '2026-04-21',
      projectId: null,
      projectName: null,
      weather: '',
      temperature: null,
      rawInput: 'Test',
    })
    useOfflineStore.getState().updateDraftStatus(id, 'failed', 'Netzwerkfehler')
    const draft = useOfflineStore.getState().drafts.find((d) => d.id === id)
    expect(draft?.syncStatus).toBe('failed')
    expect(draft?.failReason).toBe('Netzwerkfehler')
  })

  it('GIVEN draft WHEN removeDraft called SHOULD remove it', () => {
    const id = useOfflineStore.getState().addDraft({
      reportDate: '2026-04-21',
      projectId: null,
      projectName: null,
      weather: '',
      temperature: null,
      rawInput: 'Test',
    })
    useOfflineStore.getState().removeDraft(id)
    expect(useOfflineStore.getState().drafts).toHaveLength(0)
  })

  it('GIVEN online=false WHEN setOnline(true) called SHOULD update isOnline', () => {
    useOfflineStore.setState({ isOnline: false })
    useOfflineStore.getState().setOnline(true)
    expect(useOfflineStore.getState().isOnline).toBe(true)
  })
})
