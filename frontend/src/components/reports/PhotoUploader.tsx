import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reportsApi } from '../../api/reports'
import type { ReportPhoto } from '../../api/types'
import { Spinner } from '../ui'

const MAX_PHOTOS = 20
const WARN_AT = 18
const MAX_SIZE_MB = 2

function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_SIZE_MB * 1024 * 1024) return Promise.resolve(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const MAX_DIM = 1920
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width)
          width = MAX_DIM
        } else {
          width = Math.round((width * MAX_DIM) / height)
          height = MAX_DIM
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}

interface UploadingEntry {
  localId: string
  name: string
  progress: 'compressing' | 'uploading' | 'error'
  previewUrl: string
}

interface PhotoUploaderProps {
  reportId: string | null
  photos: ReportPhoto[]
  onPhotosChange: (photos: ReportPhoto[]) => void
  readOnly?: boolean
}

export function PhotoUploader({ reportId, photos, onPhotosChange, readOnly = false }: PhotoUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<UploadingEntry[]>([])
  const [pendingCaptions, setPendingCaptions] = useState<Record<string, string>>({})
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      uploading.forEach((u) => URL.revokeObjectURL(u.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canAdd = photos.length < MAX_PHOTOS && !readOnly

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!reportId || !canAdd) return
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'))
      const slots = MAX_PHOTOS - photos.length
      const toProcess = fileArray.slice(0, slots)

      for (const file of toProcess) {
        const localId = crypto.randomUUID()
        const previewUrl = URL.createObjectURL(file)

        setUploading((prev) => [
          ...prev,
          { localId, name: file.name, progress: 'compressing', previewUrl },
        ])

        try {
          const compressed = await compressImage(file)
          setUploading((prev) =>
            prev.map((u) => (u.localId === localId ? { ...u, progress: 'uploading' } : u)),
          )

          const fd = new FormData()
          fd.append('image', compressed, compressed.name)
          fd.append('taken_at', new Date(file.lastModified).toISOString())
          fd.append('position', String(photos.length + toProcess.indexOf(file)))

          const resp = await reportsApi.uploadPhoto(reportId, fd)
          onPhotosChange([...photos, resp.data])
          setUploading((prev) => {
            const entry = prev.find((u) => u.localId === localId)
            if (entry) URL.revokeObjectURL(entry.previewUrl)
            return prev.filter((u) => u.localId !== localId)
          })
        } catch {
          setUploading((prev) =>
            prev.map((u) => (u.localId === localId ? { ...u, progress: 'error' } : u)),
          )
        }
      }
    },
    [reportId, canAdd, photos, onPhotosChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleCaptionChange = (photoId: string, value: string) => {
    setPendingCaptions((prev) => ({ ...prev, [photoId]: value }))
    if (debounceTimers.current[photoId]) clearTimeout(debounceTimers.current[photoId])
    debounceTimers.current[photoId] = setTimeout(async () => {
      if (!reportId) return
      try {
        const resp = await reportsApi.updatePhoto(reportId, photoId, { caption: value })
        onPhotosChange(photos.map((p) => (p.id === photoId ? resp.data : p)))
      } catch {
        // silent — caption stays local
      }
    }, 1000)
  }

  const handleDelete = async (photoId: string) => {
    if (!reportId) return
    if (!window.confirm(t('report.photos.deleteConfirm'))) return
    try {
      await reportsApi.deletePhoto(reportId, photoId)
      onPhotosChange(photos.filter((p) => p.id !== photoId))
    } catch {
      // noop
    }
  }

  const captionValue = (photo: ReportPhoto) =>
    pendingCaptions[photo.id] !== undefined ? pendingCaptions[photo.id] : photo.caption

  return (
    <div>
      {/* Dropzone — only shown when editable */}
      {!readOnly && (
        <div
          role="button"
          aria-label={t('report.photos.dropzone')}
          tabIndex={0}
          className={`photo-dropzone${dragging ? ' dragging' : ''}`}
          onClick={() => canAdd && inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && canAdd && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{ opacity: canAdd ? 1 : 0.5, pointerEvents: canAdd ? 'auto' : 'none' }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>+</div>
          <div style={{ fontWeight: 500 }}>{t('report.photos.dropzone')}</div>
          {photos.length >= WARN_AT && photos.length < MAX_PHOTOS && (
            <div style={{ marginTop: '8px', color: 'var(--color-warning)', fontSize: '12px' }}>
              {MAX_PHOTOS - photos.length} {t('report.photos.title').toLowerCase()} verbleibend
            </div>
          )}
          {photos.length >= MAX_PHOTOS && (
            <div style={{ marginTop: '8px', color: 'var(--color-error)', fontSize: '12px' }}>
              {t('report.photos.maxReached')}
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }}
      />

      {/* In-progress uploads */}
      {uploading.length > 0 && (
        <div className="photo-thumb-grid" style={{ marginTop: '16px' }}>
          {uploading.map((u) => (
            <div key={u.localId} className="photo-thumb" style={{ opacity: 0.7 }}>
              <img src={u.previewUrl} alt={u.name} />
              <div
                className="photo-thumb-caption"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Spinner size={14} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {u.progress === 'compressing'
                    ? t('report.photos.compressing')
                    : u.progress === 'uploading'
                      ? t('report.photos.uploading')
                      : 'Fehler'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded photos grid */}
      {photos.length > 0 && (
        <div className="photo-thumb-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-thumb">
              <img src={photo.image_url} alt={photo.caption || photo.id} />
              {photo.latitude && photo.longitude && (
                <div className="photo-gps-badge">{t('report.photos.gps')}</div>
              )}
              {!readOnly && (
                <button
                  type="button"
                  className="photo-thumb-delete"
                  aria-label={t('report.photos.delete')}
                  onClick={() => handleDelete(photo.id)}
                >
                  &times;
                </button>
              )}
              <div className="photo-thumb-caption">
                {readOnly ? (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {photo.caption}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={captionValue(photo)}
                    placeholder={t('report.photos.captionPlaceholder')}
                    aria-label={t('report.photos.caption')}
                    onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12px',
                      color: 'var(--color-text)',
                      outline: 'none',
                    }}
                  />
                )}
                {photo.taken_at && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {t('report.photos.takenAt')}:{' '}
                    {new Date(photo.taken_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && uploading.length === 0 && readOnly && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
          {t('report.photos.empty')}
        </p>
      )}
    </div>
  )
}
