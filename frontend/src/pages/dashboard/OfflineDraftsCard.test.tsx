import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useOfflineStore } from '../../store/offlineStore'
import OfflineDraftsCard from './OfflineDraftsCard'

const mockDraft = (
  id: string,
  date: string,
  status: 'pending' | 'failed' = 'pending'
) => ({
  id,
  createdAt: '',
  reportDate: date,
  projectId: null,
  projectName: null,
  weather: '',
  temperature: null,
  rawInput: 'Test',
  syncStatus: status as const,
  failReason: status === 'failed' ? 'Fehler' : undefined,
})

describe('OfflineDraftsCard', () => {
  beforeEach(() => {
    useOfflineStore.setState({ drafts: [], isOnline: true })
  })

  it('GIVEN no drafts WHEN rendered SHOULD render nothing', () => {
    const { container } = renderWithProviders(<OfflineDraftsCard />)
    expect(container.firstChild).toBeNull()
  })

  it('GIVEN 2 drafts WHEN rendered SHOULD show both dates', () => {
    useOfflineStore.setState({
      drafts: [mockDraft('1', '2026-04-21'), mockDraft('2', '2026-04-20')],
    })
    renderWithProviders(<OfflineDraftsCard />)
    expect(screen.getByText(/2026-04-21/)).toBeInTheDocument()
    expect(screen.getByText(/2026-04-20/)).toBeInTheDocument()
  })

  it('GIVEN failed draft WHEN rendered SHOULD show warning text', () => {
    useOfflineStore.setState({ drafts: [mockDraft('1', '2026-04-21', 'failed')] })
    renderWithProviders(<OfflineDraftsCard />)
    expect(screen.getByText(/Fehler/)).toBeInTheDocument()
  })

  it('GIVEN online=true AND drafts WHEN sync button clicked SHOULD be clickable', async () => {
    useOfflineStore.setState({ isOnline: true, drafts: [mockDraft('1', '2026-04-21')] })
    renderWithProviders(<OfflineDraftsCard />)
    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    await userEvent.click(btn)
    // syncAll is called — no error thrown
  })
})
