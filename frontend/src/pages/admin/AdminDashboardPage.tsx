import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../api/admin'
import { Card, Spinner } from '../../components/ui'

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: '36px',
          fontWeight: 700,
          color: 'var(--color-primary)',
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</div>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats().then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner />
      </div>
    )
  }

  if (isError || !data) {
    return <p style={{ color: 'var(--color-error)' }}>{t('common.error')}</p>
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>{t('admin.title')}</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <StatCard label={t('admin.totalReports')} value={data.total_reports} />
        <StatCard label={t('admin.reportsThisMonth')} value={data.reports_this_month} />
        <StatCard label={t('admin.activeWorkers')} value={data.active_workers} />
        <StatCard label={t('admin.pendingReview')} value={data.pending_review} />
      </div>
    </div>
  )
}
