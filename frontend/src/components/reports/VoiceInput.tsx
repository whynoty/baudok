import { useTranslation } from 'react-i18next'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { Button } from '../ui'

interface VoiceInputProps {
  onTranscript: (text: string) => void
}

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const { t } = useTranslation()
  const { isListening, transcript, isSupported, start, stop } = useVoiceInput(onTranscript)

  if (!isSupported) {
    return (
      <p
        style={{
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          padding: '8px',
          background: '#fff3cd',
          borderRadius: 'var(--radius)',
          border: '1px solid #ffc107',
        }}
      >
        {t('report.voiceNotSupported')}
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Button
        variant={isListening ? 'danger' : 'secondary'}
        size="sm"
        onClick={isListening ? stop : start}
        type="button"
        style={isListening ? { background: 'var(--color-error)', color: '#fff' } : undefined}
      >
        {isListening ? (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#fff',
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
              }}
            />
            {t('report.voiceStop')} — {t('report.voiceListening')}
          </>
        ) : (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v8a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1zM9 19a8.5 8.5 0 0 0 6 0V22h-6v-3z" />
            </svg>
            {t('report.voiceStart')}
          </>
        )}
      </Button>
      {transcript && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            padding: '8px',
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius)',
            fontStyle: 'italic',
          }}
        >
          {transcript}
        </p>
      )}
    </div>
  )
}
