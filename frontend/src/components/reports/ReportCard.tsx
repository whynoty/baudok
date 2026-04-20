import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { Card } from '../ui'
import { ReportStatusBadge } from './ReportStatusBadge'
import type { DailyReport } from '../../api/types'

interface ReportCardProps {
  report: DailyReport
}

export function ReportCard({ report }: ReportCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isPrivileged = user?.role === 'supervisor' || user?.role === 'company_admin'

  const summary =
    typeof report.structured_data?.summary === 'string'
      ? report.structured_data.summary.slice(0, 100)
      : ''

  return (
    <Card
      onClick={() => navigate(`/reports/${report.id}`)}
      style={{ marginBottom: '8px', transition: 'box-shadow 0.15s' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>{report.report_date}</span>
            <ReportStatusBadge status={report.status} />
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            {report.project?.name ?? t('report.noProject')}
          </div>
          {isPrivileged && (
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              {report.created_by.first_name} {report.created_by.last_name}
            </div>
          )}
          {summary && (
            <div style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              {summary}
              {(typeof report.structured_data?.summary === 'string' &&
                report.structured_data.summary.length > 100) ? '…' : ''}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
