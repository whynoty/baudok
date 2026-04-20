import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import { Badge, Button } from '../ui'
import { LanguageSwitcher } from './LanguageSwitcher'
export function TopBar() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const company = user?.company

  return (
    <header
      style={{
        height: 56,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
        }}
      >
        {company?.name ?? ''}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <LanguageSwitcher />
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>
              {user.first_name} {user.last_name}
            </span>
            <Badge variant={user.role}>
              {t(`admin.role.${user.role}`)}
            </Badge>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={logout}>
          {t('nav.logout')}
        </Button>
      </div>
    </header>
  )
}
