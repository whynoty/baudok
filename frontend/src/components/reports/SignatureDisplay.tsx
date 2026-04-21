import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Spinner } from '../ui/Spinner'
import { useSignatures } from '../../hooks/useSignatures'

interface SignatureDisplayProps {
  reportId: string
}

export function SignatureDisplay({ reportId }: SignatureDisplayProps) {
  const { t } = useTranslation()
  const { data: signatures, isLoading } = useSignatures(reportId)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
        <Spinner size={20} />
      </div>
    )
  }

  if (!signatures || signatures.length === 0) {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
      {signatures.map((sig) => (
        <div
          key={sig.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            background: 'var(--color-surface)',
          }}
        >
          <img
            src={sig.signature_image}
            alt={`${t('signature.signedBy')} ${sig.signer_name}`}
            style={{ maxWidth: '200px', display: 'block' }}
          />
          <p style={{ margin: 0, fontSize: '13px' }}>
            <strong>{t('signature.signedBy')}:</strong> {sig.signer_name}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {t(`signature.${sig.signer_role}`)} &mdash; {t('signature.at')}{' '}
            {format(new Date(sig.signed_at), 'dd.MM.yyyy HH:mm')}
          </p>
        </div>
      ))}
    </div>
  )
}
