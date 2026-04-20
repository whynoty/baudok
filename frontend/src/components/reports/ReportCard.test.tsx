import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { useAuthStore } from '../../store/authStore'
import { mockUser, mockReport } from '../../tests/mocks/handlers'
import { ReportCard } from './ReportCard'
import type { DailyReport } from '../../api/types'

const supervisorUser = { ...mockUser, id: 'supervisor-uuid-1', role: 'supervisor' as const }

const reportWithProject: DailyReport = {
  ...mockReport,
  project: {
    id: 'project-uuid-1',
    name: 'Baustelle Hauptstraße',
    address: 'Hauptstraße 1',
    project_number: 'P-001',
    client_name: 'Test AG',
    start_date: null,
    end_date: null,
    is_active: true,
  },
}

beforeEach(() => {
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'token',
    refreshToken: 'refresh',
    isAuthenticated: true,
  })
})

describe('ReportCard', () => {
  describe('GIVEN a report', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show the report date', () => {
        renderWithProviders(<ReportCard report={mockReport} />)
        expect(screen.getByText(mockReport.report_date)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN a report with a project', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show the project name', () => {
        renderWithProviders(<ReportCard report={reportWithProject} />)
        expect(screen.getByText('Baustelle Hauptstraße')).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN worker role', () => {
    describe('WHEN rendered', () => {
      it('SHOULD NOT show the created_by name', () => {
        useAuthStore.setState({
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<ReportCard report={mockReport} />)

        expect(
          screen.queryByText(`${mockReport.created_by.first_name} ${mockReport.created_by.last_name}`)
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('GIVEN supervisor role', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show the created_by name', () => {
        useAuthStore.setState({
          user: supervisorUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          isAuthenticated: true,
        })

        renderWithProviders(<ReportCard report={mockReport} />)

        expect(
          screen.getByText(`${mockReport.created_by.first_name} ${mockReport.created_by.last_name}`)
        ).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN a click on the card', () => {
    describe('WHEN rendered', () => {
      it('SHOULD navigate away from the current view', async () => {
        const user = userEvent.setup()
        renderWithProviders(<ReportCard report={mockReport} />)

        // The card date is visible before clicking
        expect(screen.getByText(mockReport.report_date)).toBeInTheDocument()

        const card = screen.getByText(mockReport.report_date).closest('[style]') as HTMLElement
        await user.click(card)

        // MemoryRouter navigates to /reports/:id — no matching route so card unmounts
        expect(screen.queryByText(mockReport.report_date)).not.toBeInTheDocument()
      })
    })
  })
})
