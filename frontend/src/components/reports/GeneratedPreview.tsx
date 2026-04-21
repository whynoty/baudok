import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Textarea } from '../ui'
import { MaterialAutocomplete } from './MaterialAutocomplete'
import type { DailyReport, ReportEntry, EntryCategory } from '../../api/types'

interface GeneratedPreviewProps {
  report: DailyReport
  onSave: () => void
  onRegenerate: () => void
  isSaving: boolean
}

const CATEGORY_ORDER: EntryCategory[] = [
  'work_performed',
  'materials_used',
  'equipment',
  'personnel',
  'obstacle',
  'safety',
  'note',
]

export function GeneratedPreview({
  report,
  onSave,
  onRegenerate,
  isSaving,
}: GeneratedPreviewProps) {
  const { t } = useTranslation()
  const [editedEntries, setEditedEntries] = useState<Record<string, string>>(
    () =>
      Object.fromEntries((report.entries ?? []).map((e) => [e.id, e.content]))
  )

  function updateEntry(id: string, content: string) {
    setEditedEntries((prev) => ({ ...prev, [id]: content }))
  }

  const grouped = CATEGORY_ORDER.reduce<Record<EntryCategory, ReportEntry[]>>(
    (acc, cat) => {
      acc[cat] = (report.entries ?? []).filter((e) => e.category === cat)
      return acc
    },
    {} as Record<EntryCategory, ReportEntry[]>
  )

  const summary =
    typeof report.structured_data?.summary === 'string'
      ? report.structured_data.summary
      : ''

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
        padding: '20px',
        marginTop: '24px',
      }}
    >
      {CATEGORY_ORDER.map((cat) => {
        const entries = grouped[cat]
        if (!entries.length) return null
        return (
          <section key={cat} style={{ marginBottom: '20px' }}>
            <h3
              style={{
                marginBottom: '8px',
                color: 'var(--color-primary)',
                borderBottom: '1px solid var(--color-primary-light)',
                paddingBottom: '4px',
              }}
            >
              {t(`report.categories.${cat}`)}
            </h3>
            {entries.map((entry) => (
              <div key={entry.id} style={{ marginBottom: '12px' }}>
                {cat === 'materials_used' ? (
                  <div style={{ marginBottom: '4px' }}>
                    <MaterialAutocomplete
                      value={editedEntries[entry.id] ?? entry.content}
                      onChange={(val) => updateEntry(entry.id, val)}
                    />
                  </div>
                ) : (
                  <Textarea
                    rows={2}
                    value={editedEntries[entry.id] ?? entry.content}
                    onChange={(e) => updateEntry(entry.id, e.target.value)}
                    style={{ marginBottom: '4px' }}
                  />
                )}
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
              </div>
            ))}
          </section>
        )
      })}

      {summary && (
        <section style={{ marginBottom: '20px' }}>
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
          <p style={{ fontSize: '14px', color: 'var(--color-text)' }}>{summary}</p>
        </section>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onRegenerate} type="button">
          {t('report.regenerate')}
        </Button>
        <Button variant="primary" onClick={onSave} loading={isSaving} type="button">
          {t('report.save')}
        </Button>
      </div>
    </div>
  )
}
