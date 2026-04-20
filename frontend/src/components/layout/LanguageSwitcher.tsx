import { useTranslation } from 'react-i18next'
import { authApi } from '../../api/auth'
import type { Language } from '../../api/types'
import { useAuthStore } from '../../store/authStore'

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'it', label: 'IT' },
  { value: 'pt', label: 'PT' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  async function handleChange(lang: Language) {
    await i18n.changeLanguage(lang)
    if (isAuthenticated) {
      try {
        await authApi.updateMe({ preferred_language: lang })
      } catch {
        // ignore — language is already changed locally
      }
    }
  }

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value as Language)}
      style={{
        padding: '4px 8px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-surface)',
        color: 'var(--color-text)',
        fontSize: '13px',
        cursor: 'pointer',
      }}
      aria-label="Language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  )
}
