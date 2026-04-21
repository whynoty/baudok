import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShareLinks, useCreateShareLink, useDeleteShareLink } from '../../hooks/useShare'
import { Button, Card, Input, Spinner } from '../ui'

interface ShareLinkManagerProps {
  reportId: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export default function ShareLinkManager({ reportId }: ShareLinkManagerProps) {
  const { t } = useTranslation()
  const [formOpen, setFormOpen] = useState(false)
  const [expiresDays, setExpiresDays] = useState(30)
  const [note, setNote] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: links, isLoading } = useShareLinks(reportId)
  const createMutation = useCreateShareLink(reportId)
  const deleteMutation = useDeleteShareLink(reportId)

  function buildFullUrl(token: string): string {
    return `${window.location.origin}/share/${token}`
  }

  async function handleCopy(id: string, token: string) {
    try {
      await navigator.clipboard.writeText(buildFullUrl(token))
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // clipboard write failed silently
    }
  }

  function handleCreate() {
    createMutation.mutate(
      { expiresDays, note },
      {
        onSuccess: () => {
          setFormOpen(false)
          setExpiresDays(30)
          setNote('')
        },
      }
    )
  }

  function handleDeleteClick(linkId: string) {
    setDeleteConfirmId(linkId)
  }

  function handleDeleteConfirm(linkId: string) {
    deleteMutation.mutate(linkId, {
      onSuccess: () => setDeleteConfirmId(null),
    })
  }

  return (
    <section style={{ marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          borderBottom: '1px solid var(--color-primary-light)',
          paddingBottom: '4px',
        }}
      >
        <h3 style={{ color: 'var(--color-primary)', margin: 0 }}>
          {t('share.title')}
        </h3>
        {!formOpen && (
          <Button size="sm" variant="secondary" onClick={() => setFormOpen(true)}>
            {t('share.create')}
          </Button>
        )}
      </div>

      {formOpen && (
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label={t('share.expires')}
              type="number"
              min={1}
              max={365}
              value={expiresDays}
              onChange={(e) => setExpiresDays(Number(e.target.value))}
            />
            <Input
              label={t('share.note')}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('share.note')}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                onClick={handleCreate}
                loading={createMutation.isPending}
                size="sm"
              >
                {t('share.create')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFormOpen(false)
                  setExpiresDays(30)
                  setNote('')
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
          <Spinner />
        </div>
      )}

      {!isLoading && (!links || links.length === 0) && (
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          {t('share.empty')}
        </p>
      )}

      {links && links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {links.map((link) => (
            <Card key={link.id} style={{ padding: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <code
                    style={{
                      fontSize: '12px',
                      background: 'var(--color-bg)',
                      padding: '3px 6px',
                      borderRadius: 'var(--radius)',
                      wordBreak: 'break-all',
                      flex: 1,
                    }}
                  >
                    {buildFullUrl(link.token)}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleCopy(link.id, link.token)}
                  >
                    {copiedId === link.id ? t('share.copied') : t('share.copy')}
                  </Button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>
                    {t('share.expiresOn', { date: formatDate(link.expires_at) })}
                  </span>
                  <span
                    style={{
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                  >
                    {t('share.accessCount', { count: link.accessed_count })}
                  </span>
                  {link.note && <span>{link.note}</span>}
                </div>

                <div>
                  {deleteConfirmId === link.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px' }}>
                        {t('common.delete')}?
                      </span>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deleteMutation.isPending}
                        onClick={() => handleDeleteConfirm(link.id)}
                      >
                        {t('share.deactivate')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteClick(link.id)}
                    >
                      {t('share.deactivate')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
