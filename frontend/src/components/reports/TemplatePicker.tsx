import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button, Spinner } from '../ui'
import { useTemplates, useUseTemplate } from '../../hooks/useTemplates'
import type { ReportTemplate } from '../../api/types'

interface TemplatePickerProps {
  onSelect: (template: ReportTemplate) => void
  currentTrade?: string
}

export default function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: templates = [], isLoading } = useTemplates()
  const useTemplate = useUseTemplate()

  const filtered = [...templates]
    .sort((a, b) => b.usage_count - a.usage_count)
    .filter((tpl) => {
      const q = search.toLowerCase()
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.trade.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q)
      )
    })

  const handleSelect = async (tpl: ReportTemplate) => {
    await useTemplate.mutateAsync(tpl.id)
    onSelect(tpl)
    setOpen(false)
    setSearch('')
  }

  const handleClose = () => {
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t('templates.use')}
      </Button>

      <Modal isOpen={open} onClose={handleClose} title={t('templates.pickTitle')}>
        <input
          type="text"
          aria-label={t('templates.search')}
          placeholder={t('templates.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            marginBottom: 16,
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <p
            style={{
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              padding: 24,
            }}
          >
            {templates.length === 0 ? t('templates.empty') : t('templates.noMatch')}
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            {filtered.map((tpl) => (
              <div
                key={tpl.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  padding: 12,
                  background: 'var(--color-surface)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 4,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 14 }}>{tpl.name}</strong>
                    {tpl.trade && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        {tpl.trade}
                      </span>
                    )}
                    {tpl.is_company_wide && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          background: '#e3f2fd',
                          color: '#1565c0',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        {t('templates.companyWide')}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSelect(tpl)}
                    loading={useTemplate.isPending}
                  >
                    {t('templates.useThis')}
                  </Button>
                </div>
                {tpl.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    {tpl.description.length > 100
                      ? tpl.description.slice(0, 100) + '\u2026'
                      : tpl.description}
                  </p>
                )}
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {t('templates.usedCount', { count: tpl.usage_count })}
                  {tpl.created_by_name && ` \u00b7 ${tpl.created_by_name}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
