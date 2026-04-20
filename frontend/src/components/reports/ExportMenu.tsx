import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { reportsApi } from '../../api/reports'
import { Button, Modal, Input } from '../ui'

interface ExportMenuProps {
  reportId: string
}

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

export function ExportMenu({ reportId }: ExportMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [pdfPending, setPdfPending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handlePdf() {
    setOpen(false)
    setPdfPending(true)
    try {
      const res = await reportsApi.downloadPdf(reportId)
      if (res.status === 202) {
        // Poll every 3 seconds
        const pollInterval = setInterval(async () => {
          try {
            const pollRes = await reportsApi.downloadPdf(reportId)
            if (pollRes.status === 200) {
              clearInterval(pollInterval)
              setPdfPending(false)
              downloadBlob(pollRes.data as Blob, `report-${reportId}.pdf`)
            }
          } catch {
            clearInterval(pollInterval)
            setPdfPending(false)
          }
        }, 3000)
      } else {
        setPdfPending(false)
        downloadBlob(res.data as Blob, `report-${reportId}.pdf`)
      }
    } catch {
      setPdfPending(false)
    }
  }

  async function handleCsv() {
    setOpen(false)
    const res = await reportsApi.exportCsv(reportId)
    downloadBlob(res.data as Blob, `report-${reportId}.csv`)
  }

  async function handleExcel() {
    setOpen(false)
    const res = await reportsApi.exportExcel(reportId)
    downloadBlob(res.data as Blob, `report-${reportId}.xlsx`)
  }

  async function handleSendEmail() {
    await reportsApi.sendEmail(reportId, recipientEmail)
    setEmailSent(true)
    setEmailModalOpen(false)
    setRecipientEmail('')
  }

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
        <Button
          variant="secondary"
          onClick={() => setOpen((v) => !v)}
          loading={pdfPending}
          type="button"
        >
          {pdfPending ? t('report.generating') : 'Export'}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </Button>
        {open && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-md)',
              minWidth: 180,
              zIndex: 200,
              marginBottom: '4px',
            }}
          >
            {[
              { label: t('report.exportPdf'), action: handlePdf },
              { label: t('report.exportCsv'), action: handleCsv },
              { label: t('report.exportExcel'), action: handleExcel },
              {
                label: t('report.sendEmail'),
                action: () => {
                  setOpen(false)
                  setEmailModalOpen(true)
                },
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-text)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {emailSent && (
        <span style={{ fontSize: '13px', color: 'var(--color-success)', marginLeft: '8px' }}>
          {t('report.emailSent')}
        </span>
      )}

      <Modal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title={t('report.sendEmail')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailModalOpen(false)} type="button">
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSendEmail}
              disabled={!recipientEmail}
              type="button"
            >
              {t('report.sendEmailConfirm')}
            </Button>
          </>
        }
      >
        <Input
          label={t('report.emailRecipient')}
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
        />
      </Modal>
    </>
  )
}
