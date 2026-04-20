import { useTranslation } from 'react-i18next'
import { useOfflineStore } from '../../store/offlineStore'
import { useSyncDrafts } from '../../hooks/useSyncDrafts'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function OfflineDraftsCard() {
  const { t } = useTranslation()
  const { drafts } = useOfflineStore()
  const { syncAll } = useSyncDrafts()
  const isOnline = useOnlineStatus()

  if (drafts.length === 0) return null

  return (
    <div
      style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: 6,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h3 style={{ marginBottom: 8, fontSize: '1rem' }}>
        {t('offline.pendingDrafts', { count: drafts.length })}
      </h3>
      <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
        {drafts.map((d) => (
          <li key={d.id} style={{ fontSize: 13, marginBottom: 4 }}>
            {d.reportDate}
            {d.projectName ? ` – ${d.projectName}` : ''}
            {d.syncStatus === 'failed' && (
              <span style={{ color: '#dc3545', marginLeft: 8 }}>
                &#9888; {d.failReason}
              </span>
            )}
            {d.syncStatus === 'syncing' && (
              <span style={{ color: '#6c757d', marginLeft: 8 }}>
                {t('offline.syncing')}
              </span>
            )}
          </li>
        ))}
      </ul>
      {isOnline && (
        <button
          onClick={syncAll}
          style={{
            background: '#1a6b3c',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {t('offline.syncNow')}
        </button>
      )}
    </div>
  )
}
