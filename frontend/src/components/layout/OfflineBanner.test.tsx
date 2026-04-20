import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useOfflineStore } from '../../store/offlineStore'
import OfflineBanner from './OfflineBanner'

describe('OfflineBanner', () => {
  beforeEach(() => {
    useOfflineStore.setState({ isOnline: true, drafts: [] })
  })

  it('GIVEN isOnline=false WHEN rendered SHOULD show offline banner', () => {
    useOfflineStore.setState({ isOnline: false })
    renderWithProviders(<OfflineBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('GIVEN isOnline=true AND no drafts WHEN rendered SHOULD show nothing', () => {
    renderWithProviders(<OfflineBanner />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('GIVEN isOnline=false AND 2 drafts WHEN rendered SHOULD show draft count', () => {
    useOfflineStore.setState({
      isOnline: false,
      drafts: [
        {
          id: '1',
          createdAt: '',
          reportDate: '2026-04-21',
          projectId: null,
          projectName: null,
          weather: '',
          temperature: null,
          rawInput: 'A',
          syncStatus: 'pending',
        },
        {
          id: '2',
          createdAt: '',
          reportDate: '2026-04-20',
          projectId: null,
          projectName: null,
          weather: '',
          temperature: null,
          rawInput: 'B',
          syncStatus: 'pending',
        },
      ],
    })
    renderWithProviders(<OfflineBanner />)
    expect(screen.getByRole('alert').textContent).toMatch(/2/)
  })
})
