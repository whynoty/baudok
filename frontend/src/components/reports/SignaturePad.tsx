import { useRef, useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { AxiosError } from 'axios'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { useCreateSignature } from '../../hooks/useSignatures'

interface SignaturePadProps {
  reportId: string
  onSigned: () => void
}

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 150

export function SignaturePad({ reportId, onSigned }: SignaturePadProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const isDrawing = useRef(false)

  const createSignatureMutation = useCreateSignature(reportId)

  // Fill canvas white on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    event: PointerEvent
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    isDrawing.current = true
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasPoint(canvas, event.nativeEvent)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setHasDrawn(true)
    setErrorMessage(null)
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasPoint(canvas, event.nativeEvent)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [])

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false
  }, [])

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    setHasDrawn(false)
    setErrorMessage(null)
    setSuccessMessage(null)
  }, [])

  const handleSign = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) return
    const dataUrl = canvas.toDataURL('image/png')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await createSignatureMutation.mutateAsync(dataUrl)
      setSuccessMessage(t('signature.success'))
      onSigned()
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>
      if (axiosErr.response?.status === 409) {
        setErrorMessage(t('signature.alreadySigned'))
      } else {
        setErrorMessage(t('common.error'))
      }
    }
  }, [hasDrawn, createSignatureMutation, t, onSigned])

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '1px solid var(--color-border)',
          display: 'block',
          touchAction: 'none',
          cursor: 'crosshair',
          maxWidth: '100%',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
        <Button variant="secondary" size="sm" type="button" onClick={handleClear}>
          {t('signature.clear')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          disabled={!hasDrawn || createSignatureMutation.isPending}
          onClick={handleSign}
        >
          {createSignatureMutation.isPending && (
            <Spinner size={14} color="currentColor" style={{ marginRight: '4px' }} />
          )}
          {t('signature.sign')}
        </Button>
      </div>

      {errorMessage && (
        <p
          role="alert"
          style={{
            marginTop: '6px',
            fontSize: '13px',
            color: 'var(--color-error)',
          }}
        >
          {errorMessage}
        </p>
      )}

      {successMessage && !errorMessage && (
        <p
          style={{
            marginTop: '6px',
            fontSize: '13px',
            color: 'var(--color-success)',
          }}
        >
          {successMessage}
        </p>
      )}
    </div>
  )
}
