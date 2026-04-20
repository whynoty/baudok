import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReportPhoto } from '../../api/types'
import { Modal, Button } from '../ui'

interface PhotoGridProps {
  photos: ReportPhoto[]
}

export function PhotoGrid({ photos }: PhotoGridProps) {
  const { t } = useTranslation()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
        {t('report.photos.empty')}
      </p>
    )
  }

  const current = lightboxIndex !== null ? photos[lightboxIndex] : null

  const goTo = (index: number) => {
    const clamped = (index + photos.length) % photos.length
    setLightboxIndex(clamped)
  }

  return (
    <>
      <div className="photo-thumb-grid">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="photo-thumb"
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            aria-label={photo.caption || `${t('report.photos.title')} ${index + 1}`}
            onClick={() => setLightboxIndex(index)}
            onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(index)}
          >
            <img src={photo.image_url} alt={photo.caption || ''} />
            {photo.latitude && photo.longitude && (
              <div className="photo-gps-badge">{t('report.photos.gps')}</div>
            )}
            <div className="photo-thumb-caption">
              {photo.caption && (
                <div style={{ fontSize: '12px', color: 'var(--color-text)', marginBottom: '2px' }}>
                  {photo.caption}
                </div>
              )}
              {photo.taken_at && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {t('report.photos.takenAt')}: {new Date(photo.taken_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        title={current?.caption || t('report.photos.title')}
        footer={
          photos.length > 1 ? (
            <div className="lightbox-nav" style={{ width: '100%' }}>
              <Button
                type="button"
                onClick={() => lightboxIndex !== null && goTo(lightboxIndex - 1)}
              >
                &#8592;
              </Button>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {lightboxIndex !== null ? lightboxIndex + 1 : 0} / {photos.length}
              </span>
              <Button
                type="button"
                onClick={() => lightboxIndex !== null && goTo(lightboxIndex + 1)}
              >
                &#8594;
              </Button>
            </div>
          ) : undefined
        }
      >
        {current && (
          <div>
            <img
              className="lightbox-img"
              src={current.image_url}
              alt={current.caption || ''}
            />
            {current.caption && (
              <p style={{ marginTop: '12px', fontSize: '14px' }}>{current.caption}</p>
            )}
            {current.taken_at && (
              <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {t('report.photos.takenAt')}: {new Date(current.taken_at).toLocaleString()}
              </p>
            )}
            {current.latitude && current.longitude && (
              <p
                style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    background: 'rgba(26,107,60,0.85)',
                    color: 'white',
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {t('report.photos.gps')}
                </span>
                {current.latitude}, {current.longitude}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
