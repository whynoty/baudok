import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'

interface NavItem {
  to: string
  label: string
}

export function Sidebar() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const navItems: NavItem[] = [
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/reports/new', label: t('nav.newReport') },
    { to: '/reports', label: t('nav.history') },
  ]

  if (user?.role === 'company_admin') {
    navItems.push({ to: '/admin', label: t('nav.admin') })
    navItems.push({ to: '/admin/settings', label: t('nav.settings') })
  }

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            letterSpacing: '-0.5px',
          }}
        >
          BauDok
        </span>
      </div>

      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/reports'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 16px',
              fontSize: '14px',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
              background: isActive ? 'var(--color-primary-light)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'background 0.1s',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '13px',
          }}
        >
          <div style={{ fontWeight: 500 }}>
            {user.first_name} {user.last_name}
          </div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {user.trade}
          </div>
        </div>
      )}
    </aside>
  )
}
