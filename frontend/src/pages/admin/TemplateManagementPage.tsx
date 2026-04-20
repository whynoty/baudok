import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTemplates, useCreateTemplate, useDeleteTemplate, useUpdateTemplate } from '../../hooks/useTemplates'
import { Button, Modal, Input, Textarea, Spinner } from '../../components/ui'
import type { ReportTemplate } from '../../api/types'

interface TemplateFormState {
  name: string
  trade: string
  description: string
  raw_input_template: string
  is_company_wide: boolean
}

const emptyForm = (): TemplateFormState => ({
  name: '',
  trade: '',
  description: '',
  raw_input_template: '',
  is_company_wide: false,
})

export default function TemplateManagementPage() {
  const { t } = useTranslation()
  const { data: templates = [], isLoading } = useTemplates()
  const createTemplate = useCreateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const updateTemplate = useUpdateTemplate()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null)
  const [form, setForm] = useState<TemplateFormState>(emptyForm())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingTemplate(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (tpl: ReportTemplate) => {
    setEditingTemplate(tpl)
    setForm({
      name: tpl.name,
      trade: tpl.trade,
      description: tpl.description,
      raw_input_template: tpl.raw_input_template,
      is_company_wide: tpl.is_company_wide,
    })
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingTemplate(null)
    setForm(emptyForm())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, data: form })
    } else {
      await createTemplate.mutateAsync(form)
    }
    handleClose()
  }

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync(id)
    setDeleteConfirmId(null)
  }

  const setField = <K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending

  return (
    <div style={{ maxWidth: 900 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>{t('templates.manage')}</h1>
        <Button onClick={openCreate}>{t('templates.newTemplate')}</Button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner />
        </div>
      ) : templates.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: 'var(--color-text-muted)',
            border: '1px dashed var(--color-border)',
            borderRadius: 8,
          }}
        >
          <p style={{ marginBottom: 16 }}>{t('templates.empty')}</p>
          <Button onClick={openCreate}>{t('templates.newTemplate')}</Button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--color-border)',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{t('templates.name')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{t('templates.trade')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{t('templates.companyWide')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{t('templates.usedCount', { count: 0 })}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>{t('admin.users')}</th>
                <th style={{ padding: '8px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr
                  key={tpl.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{tpl.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>
                    {tpl.trade || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {tpl.is_company_wide ? (
                      <span
                        style={{
                          fontSize: 11,
                          background: '#e3f2fd',
                          color: '#1565c0',
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        {t('templates.companyWide')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>
                    {tpl.usage_count}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>
                    {tpl.created_by_name ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(tpl)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteConfirmId(tpl.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleClose}
        title={editingTemplate ? t('common.edit') : t('templates.newTemplate')}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Input
            label={t('templates.name')}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
            placeholder={t('templates.namePlaceholder')}
          />
          <Input
            label={t('templates.trade')}
            value={form.trade}
            onChange={(e) => setField('trade', e.target.value)}
            placeholder={t('admin.trade')}
          />
          <Textarea
            label={t('templates.description')}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={2}
            placeholder={t('templates.descriptionPlaceholder')}
          />
          <Textarea
            label={t('templates.rawInput')}
            value={form.raw_input_template}
            onChange={(e) => setField('raw_input_template', e.target.value)}
            rows={4}
            required
            placeholder={t('report.rawInputPlaceholder')}
          />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={form.is_company_wide}
              onChange={(e) => setField('is_company_wide', e.target.checked)}
            />
            {t('templates.shareWithCompany')}
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isPending}>
              {t('templates.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title={t('common.delete')}
      >
        <p style={{ marginBottom: 20 }}>{t('templates.deleteConfirm')}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteConfirmId(null)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deleteTemplate.isPending}
            onClick={() => {
              if (deleteConfirmId) handleDelete(deleteConfirmId)
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
