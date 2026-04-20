import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOfflineStore } from '../../store/offlineStore'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useSyncDrafts } from '../../hooks/useSyncDrafts'

export default function OfflineBanner() {
  const { t } = useTranslation()
  const isOnline = useOnlineStatus()
  const { drafts } = useOfflineStore()
  const { syncAll, pendingCount } = useSyncDrafts()
  const [showReconnected, setShowReconnected] = useState(false)
  const [prevOnline, setPrevOnline] = useState(isOnline)

  useEffect(() => {
    if (!prevOnline && isOnline && pendingCount > 0) {
      setShowReconnected(true)
      syncAll()
      const timer = setTimeout(() => setShowReconnected(false), 4000)
      setPrevOnline(true)
      return () => clearTimeout(timer)
    }
    setPrevOnline(isOnline)
  }, [isOnline, pendingCount, prevOnline, syncAll])

  if (!isOnline) {
    const offlineText =
      drafts.length > 0
        ? `${t('offline.banner')} ${t('offline.draftsQueued', { count: drafts.length })}`
        : t('offline.banner')
    return (
      <div
        role="alert"
        aria-live="polite"
        style={{
          background: '#ffc107',
          color: '#212529',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {offlineText}
      </div>
    )
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background: '#198754',
          color: '#fff',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {t('offline.reconnected', { count: pendingCount })}
      </div>
    )
  }

  return null
}
