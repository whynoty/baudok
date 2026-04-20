import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button, Input, Textarea } from '../ui'
import { useSaveAsTemplate } from '../../hooks/useTemplates'
import { useAuthStore } from '../../store/authStore'

interface SaveAsTemplateButtonProps {
  reportId: string
  rawInputText: string
}

export default function SaveAsTemplateButton({ reportId }: SaveAsTemplateButtonProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCompanyWide, setIsCompanyWide] = useState(false)
  const [saved, setSaved] = useState(false)
  const user = useAuthStore((s) => s.user)
  const saveAs = useSaveAsTemplate()
  const canShareCompanyWide = user?.role !== 'worker'

  const handleClose = () => {
    setOpen(false)
    setSaved(false)
    setName('')
    setDescription('')
    setIsCompanyWide(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveAs.mutateAsync({ reportId, name, description, isCompanyWide })
    setSaved(true)
    setTimeout(() => {
      handleClose()
    }, 1500)
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t('templates.saveAs')}
      </Button>

      <Modal isOpen={open} onClose={handleClose} title={t('templates.saveAsTitle')}>
        {saved ? (
          <p
            style={{
              color: 'var(--color-success)',
              textAlign: 'center',
              padding: 24,
            }}
          >
            {'\u2713'} {t('templates.saved')}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <Input
              label={t('templates.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t('templates.namePlaceholder')}
            />
            <Textarea
              label={t('templates.description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('templates.descriptionPlaceholder')}
            />
            {canShareCompanyWide && (
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
                  checked={isCompanyWide}
                  onChange={(e) => setIsCompanyWide(e.target.checked)}
                />
                {t('templates.shareWithCompany')}
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={saveAs.isPending}>
                {t('templates.save')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
