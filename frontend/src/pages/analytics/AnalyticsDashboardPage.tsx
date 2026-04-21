import { useState, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useAnalytics } from '../../hooks/useAnalytics'
import { useProjects } from '../../hooks/useProjects'
import { Spinner, Card, Button, Select } from '../../components/ui'
import type { AnalyticsFilters } from '../../api/analytics'
import type { PaginatedResponse, Project } from '../../api/types'

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

function submissionRateColor(pct: number): string {
  if (pct >= 80) return '#16a34a'
  if (pct >= 60) return '#d97706'
  return '#dc2626'
}

interface FilterBarProps {
  filters: AnalyticsFilters
  onChange: (next: AnalyticsFilters) => void
  projectOptions: Array<{ value: string; label: string }>
}

function FilterBar({ filters, onChange, projectOptions }: FilterBarProps) {
  const { t } = useTranslation()

  const allProjectOptions = [
    { value: '', label: t('analytics.filterProject') },
    ...projectOptions,
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'flex-end',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}
          htmlFor="analytics-date-from"
        >
          {t('analytics.filterFrom')}
        </label>
        <input
          id="analytics-date-from"
          type="date"
          value={filters.date_from ?? ''}
          onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}
          htmlFor="analytics-date-to"
        >
          {t('analytics.filterTo')}
        </label>
        <input
          id="analytics-date-to"
          type="date"
          value={filters.date_to ?? ''}
          onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ minWidth: '200px' }}>
        <Select
          label={t('analytics.filterProject')}
          value={filters.project ?? ''}
          options={allProjectOptions}
          onChange={(e) =>
            onChange({ ...filters, project: e.target.value || undefined })
          }
        />
      </div>

      <Button
        variant="secondary"
        onClick={() => onChange({})}
        style={{ alignSelf: 'flex-end' }}
      >
        {t('analytics.reset')}
      </Button>
    </div>
  )
}

interface ChartSectionProps {
  title: string
  isEmpty: boolean
  children: ReactNode
}

function ChartSection({ title, isEmpty, children }: ChartSectionProps) {
  const { t } = useTranslation()

  return (
    <Card style={{ marginBottom: '24px' }}>
      <h2
        style={{
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
        }}
      >
        {title}
      </h2>
      {isEmpty ? (
        <div
          style={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            fontSize: '14px',
          }}
        >
          {t('analytics.noData')}
        </div>
      ) : (
        children
      )}
    </Card>
  )
}

export default function AnalyticsDashboardPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<AnalyticsFilters>({})

  const { data, isLoading, error } = useAnalytics(filters)

  const projectsQuery = useProjects({ is_active: true })
  const projectsData = projectsQuery.data as PaginatedResponse<Project> | undefined

  const projectOptions = (projectsData?.results ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }))

  const handleFiltersChange = useCallback((next: AnalyticsFilters) => {
    setFilters(next)
  }, [])

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spinner size={40} />
      </div>
    )
  }

  const is403 =
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 403

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <p role="alert" style={{ color: 'var(--color-error)', fontSize: '15px' }}>
          {is403 ? t('analytics.noAccess') : t('common.error')}
        </p>
      </div>
    )
  }

  const reportsByDay = data?.reports_by_day ?? []
  const hoursByProject = data?.hours_by_project ?? []
  const materialsByProject = data?.materials_by_project ?? []
  const topWorkers = data?.top_workers ?? []
  const submissionRate = data?.submission_rate ?? { on_time: 0, total: 0, percentage: 0 }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '22px',
          fontWeight: 700,
          marginBottom: '24px',
          color: 'var(--color-text)',
        }}
      >
        {t('analytics.title')}
      </h1>

      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        projectOptions={projectOptions}
      />

      {/* Submission rate card */}
      <Card style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '12px',
            color: 'var(--color-text)',
          }}
        >
          {t('analytics.submissionRate')}
        </h2>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: submissionRateColor(submissionRate.percentage),
            lineHeight: 1,
            marginBottom: '8px',
          }}
        >
          {submissionRate.percentage.toFixed(1)}%
        </div>
        <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          {t('analytics.submittedOnTime', {
            count: submissionRate.on_time,
            total: submissionRate.total,
          })}
        </div>
      </Card>

      {/* Reports per day chart */}
      <ChartSection
        title={t('analytics.reportsByDay')}
        isEmpty={reportsByDay.length === 0}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportsByDay} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Hours by project chart */}
      <ChartSection
        title={t('analytics.hoursByProject')}
        isEmpty={hoursByProject.length === 0}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={hoursByProject.map((d) => ({
              ...d,
              project_name: truncate(d.project_name, 20),
            }))}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="project_name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="total_hours" fill="#16a34a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Materials by project chart */}
      <ChartSection
        title={t('analytics.materialsByProject')}
        isEmpty={materialsByProject.length === 0}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={materialsByProject.map((d) => ({
              ...d,
              project_name: truncate(d.project_name, 20),
            }))}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="project_name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="entries" fill="#d97706" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Top workers table */}
      <ChartSection
        title={t('analytics.topWorkers')}
        isEmpty={topWorkers.length === 0}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--color-border)',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>
                  {t('analytics.worker')}
                </th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>
                  {t('analytics.reportCount')}
                </th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>
                  {t('analytics.totalHours')}
                </th>
              </tr>
            </thead>
            <tbody>
              {topWorkers.map((w) => (
                <tr
                  key={w.worker_id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <td style={{ padding: '10px 12px' }}>{w.worker_name}</td>
                  <td style={{ padding: '10px 12px' }}>{w.report_count}</td>
                  <td style={{ padding: '10px 12px' }}>{w.total_hours.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartSection>
    </div>
  )
}
