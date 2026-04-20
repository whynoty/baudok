import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { adminApi } from '../../api/admin'
import { useReports } from '../../hooks/useReports'
import { Button, Card, Spinner } from '../../components/ui'
import { ReportCard } from '../../components/reports/ReportCard'

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card style={{ flex: 1, textAlign: 'center' }}>
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--color-primary)',
          marginBottom: '4px',
        }}
      >
        {value ?? '—'}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</div>
    </Card>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isPrivileged = user?.role === 'supervisor' || user?.role === 'company_admin'

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
    enabled: isPrivileged,
  })

  const { data: recentData, isLoading } = useReports({ page: 1 })

  // For workers: compute stats from own reports
  const reportsToday = isPrivileged
    ? undefined
    : recentData?.results.filter((r) => r.report_date === new Date().toISOString().split('T')[0]).length

  const reportsThisWeek = isPrivileged ? undefined : recentData?.results.length

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1>
          {t('dashboard.welcome')}
          {user ? `, ${user.first_name}` : ''}
        </h1>
        <Button onClick={() => navigate('/reports/new')}>{t('dashboard.newReport')}</Button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <StatCard
          label={t('dashboard.reportsToday')}
          value={isPrivileged ? stats?.total_reports : reportsToday}
        />
        <StatCard
          label={t('dashboard.reportsThisWeek')}
          value={isPrivileged ? stats?.reports_this_month : reportsThisWeek}
        />
        <StatCard
          label={t('dashboard.pendingReview')}
          value={isPrivileged ? stats?.pending_review : undefined}
        />
      </div>

      <h2 style={{ marginBottom: '12px' }}>{t('dashboard.recentReports')}</h2>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Spinner />
        </div>
      ) : recentData?.results.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{t('dashboard.noReports')}</p>
      ) : (
        <div>
          {recentData?.results.slice(0, 5).map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
