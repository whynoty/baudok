import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useReport } from '../../hooks/useReports'
import { reportsApi } from '../../api/reports'
import { Spinner, Button, Textarea, Card } from '../../components/ui'
import { ReportStatusBadge } from '../../components/reports/ReportStatusBadge'
import { ExportMenu } from '../../components/reports/ExportMenu'
import { PhotoGrid } from '../../components/reports/PhotoGrid'
import { PhotoUploader } from '../../components/reports/PhotoUploader'
import SaveAsTemplateButton from '../../components/reports/SaveAsTemplateButton'
import RoleGuard from '../../components/auth/RoleGuard'
import { useAuthStore } from '../../store/authStore'
import type { EntryCategory, ReportPhoto } from '../../api/types'

const CATEGORY_ORDER: EntryCategory[] = [
  'work_performed',
  'materials_used',
  'equipment',
  'personnel',
  'obstacle',
  'safety',
  'note',
]

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data: report, isLoading, isError } = useReport(id ?? '')
  const [rawInputOpen, setRawInputOpen] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [photos, setPhotos] = useState<ReportPhoto[] | null>(null)
  const currentUser = useAuthStore((s) => s.user)

  const reviewMutation = useMutation({
    mutationFn: () => reportsApi.review(id ?? '', reviewNotes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] })
      setReviewNotes('')
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Spinner />
      </div>
    )
  }

  if (isError || !report) {
    return (
      <p style={{ color: 'var(--color-error)' }}>
        {t('common.error')}
      </p>
    )
  }

  type EntryList = typeof report.entries
  const entriesByCategory = CATEGORY_ORDER.reduce<Record<string, EntryList>>((acc, cat) => {
    const entries = (report.entries ?? []).filter((e) => e.category === cat)
    if (entries.length) acc[cat] = entries
    return acc
  }, {})

  // Derive effective photo list: local state overrides what came with the report
  const effectivePhotos = photos ?? (report.photos ?? [])

  const isOwner = currentUser?.id === report.created_by.id
  const canEditPhotos =
    isOwner ||
    currentUser?.role === 'supervisor' ||
    currentUser?.role === 'company_admin'

  return (
    <div style={{ maxWidth: '800px', paddingBottom: '80px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1>{report.report_date}</h1>
            <ReportStatusBadge status={report.status} />
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', display: 'flex', gap: '16px' }}>
            <span>{report.project?.name ?? t('report.noProject')}</span>
            <span>
              {report.created_by.first_name} {report.created_by.last_name}
            </span>
            {report.weather && <span>{report.weather}</span>}
            {report.temperature !== null && (
              <span>{report.temperature}°C</span>
            )}
          </div>
        </div>
      </div>

      {/* Entries by category */}
      {Object.entries(entriesByCategory).map(([cat, entries]) => (
        <section key={cat} style={{ marginBottom: '24px' }}>
          <h3
            style={{
              marginBottom: '8px',
              color: 'var(--color-primary)',
              borderBottom: '1px solid var(--color-primary-light)',
              paddingBottom: '4px',
            }}
          >
            {t(`report.categories.${cat as EntryCategory}`)}
          </h3>
          {entries?.map((entry) => (
            <Card key={entry.id} style={{ marginBottom: '8px' }}>
              <p style={{ marginBottom: '4px' }}>{entry.content}</p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}
              >
                {entry.duration_hours && (
                  <span>
                    {t('report.durationHours')}: {entry.duration_hours}
                  </span>
                )}
                {entry.quantity && (
                  <span>
                    {t('report.quantity')}: {entry.quantity}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </section>
      ))}

      {/* Summary */}
      {typeof report.structured_data?.summary === 'string' && report.structured_data.summary && (
        <section style={{ marginBottom: '24px' }}>
          <h3
            style={{
              marginBottom: '8px',
              color: 'var(--color-primary)',
              borderBottom: '1px solid var(--color-primary-light)',
              paddingBottom: '4px',
            }}
          >
            {t('report.summary')}
          </h3>
          <p>{report.structured_data.summary as string}</p>
        </section>
      )}

      {/* Photos section */}
      <section style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
            borderBottom: '1px solid var(--color-primary-light)',
            paddingBottom: '4px',
          }}
        >
          <h3 style={{ color: 'var(--color-primary)', margin: 0 }}>
            {t('report.photos.title')}
          </h3>
          {effectivePhotos.length > 0 && (
            <span
              style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {effectivePhotos.length}
            </span>
          )}
        </div>

        {canEditPhotos ? (
          <PhotoUploader
            reportId={report.id}
            photos={effectivePhotos}
            onPhotosChange={setPhotos}
          />
        ) : (
          <PhotoGrid photos={effectivePhotos} />
        )}
      </section>

      {/* Collapsible raw input */}
      <section style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setRawInputOpen((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
            padding: 0,
          }}
        >
          {rawInputOpen ? '▾' : '▸'} {t('report.rawInputLabel')}
        </button>
        {rawInputOpen && (
          <div
            style={{
              marginTop: '8px',
              padding: '12px',
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            {report.raw_input_text}
          </div>
        )}
      </section>

      {/* Review panel */}
      <RoleGuard roles={['supervisor', 'company_admin']}>
        {report.status !== 'reviewed' && report.status !== 'sent' && (
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>{t('report.review')}</h3>
            <Textarea
              label={t('report.reviewNotes')}
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              style={{ marginBottom: '12px' }}
            />
            <Button
              onClick={() => reviewMutation.mutate()}
              loading={reviewMutation.isPending}
              type="button"
            >
              {t('report.reviewConfirm')}
            </Button>
            {reviewMutation.isSuccess && (
              <span
                style={{
                  marginLeft: '12px',
                  fontSize: '13px',
                  color: 'var(--color-success)',
                }}
              >
                {t('report.reviewed')}
              </span>
            )}
          </Card>
        )}
      </RoleGuard>

      {/* Sticky export bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 220,
          right: 0,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {(isOwner || currentUser?.role === 'supervisor' || currentUser?.role === 'company_admin') && (
          <SaveAsTemplateButton
            reportId={report.id}
            rawInputText={report.raw_input_text}
          />
        )}
        <ExportMenu reportId={report.id} />
      </div>
    </div>
  )
}
