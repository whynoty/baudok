import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useReports } from '../../hooks/useReports'
import { useProjects } from '../../hooks/useProjects'
import { reportsApi } from '../../api/reports'
import { adminApi } from '../../api/admin'
import { ReportCard } from '../../components/reports/ReportCard'
import { Button, Select, Input, Spinner, Modal } from '../../components/ui'
import RoleGuard from '../../components/auth/RoleGuard'
import type { ReportFilters } from '../../api/reports'

const STATUS_OPTIONS = ['draft', 'generated', 'reviewed', 'sent'] as const

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ReportHistoryPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [workerFilter, setWorkerFilter] = useState('')
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const filters: ReportFilters = {
    page,
    project: projectFilter || undefined,
    status: statusFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    worker: workerFilter || undefined,
  }

  const { data, isLoading } = useReports(filters)
  const { data: projectsData } = useProjects()

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  const bulkExportMutation = useMutation({
    mutationFn: (format: 'csv' | 'excel') =>
      reportsApi
        .bulkExport({ ...filters, format })
        .then((r) => {
          downloadBlob(
            r.data as Blob,
            `reports-export.${format === 'excel' ? 'xlsx' : 'csv'}`
          )
        }),
    onSuccess: () => setBulkModalOpen(false),
  })

  const projectOptions = [
    { value: '', label: t('history.allProjects') },
    ...(projectsData?.results ?? []).map((p) => ({ value: p.id, label: p.name })),
  ]

  const statusOptions = [
    { value: '', label: t('history.allStatuses') },
    ...STATUS_OPTIONS.map((s) => ({ value: s, label: t(`report.status.${s}`) })),
  ]

  const workerOptions = [
    { value: '', label: t('history.allWorkers') },
    ...(usersData ?? []).map((u) => ({
      value: u.id,
      label: `${u.first_name} ${u.last_name}`,
    })),
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1>{t('history.title')}</h1>
        <RoleGuard roles={['supervisor', 'company_admin']}>
          <Button variant="secondary" onClick={() => setBulkModalOpen(true)} type="button">
            {t('history.bulkExport')}
          </Button>
        </RoleGuard>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <Input
          label={t('history.dateFrom')}
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
        />
        <Input
          label={t('history.dateTo')}
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
        />
        <Select
          label={t('history.filterByProject')}
          options={projectOptions}
          value={projectFilter}
          onChange={(e) => {
            setProjectFilter(e.target.value)
            setPage(1)
          }}
        />
        <Select
          label={t('history.filterByStatus')}
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
        />
        <RoleGuard roles={['supervisor', 'company_admin']}>
          <Select
            label={t('history.filterByWorker')}
            options={workerOptions}
            value={workerFilter}
            onChange={(e) => {
              setWorkerFilter(e.target.value)
              setPage(1)
            }}
          />
        </RoleGuard>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Spinner />
        </div>
      ) : data?.results.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{t('history.noResults')}</p>
      ) : (
        <div>
          {data?.results.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && (data.previous ?? data.next) && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          <Button
            variant="secondary"
            disabled={!data.previous}
            onClick={() => setPage((p) => p - 1)}
            type="button"
          >
            ← Prev
          </Button>
          <Button
            variant="secondary"
            disabled={!data.next}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Next →
          </Button>
        </div>
      )}

      {/* Bulk export modal */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={t('history.bulkExport')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBulkModalOpen(false)}
              type="button"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => bulkExportMutation.mutate('csv')}
              loading={bulkExportMutation.isPending}
              type="button"
            >
              {t('report.exportCsv')}
            </Button>
            <Button
              onClick={() => bulkExportMutation.mutate('excel')}
              loading={bulkExportMutation.isPending}
              type="button"
            >
              {t('report.exportExcel')}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {t('history.bulkExport')}
        </p>
      </Modal>
    </div>
  )
}
