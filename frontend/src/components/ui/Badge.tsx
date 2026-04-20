import type { CSSProperties, ReactNode } from 'react'
import type { ReportStatus, UserRole } from '../../api/types'

type BadgeVariant = ReportStatus | UserRole | 'default'

const colorMap: Record<BadgeVariant, { background: string; color: string }> = {
  // ReportStatus
  draft: { background: '#e9ecef', color: '#495057' },
  generated: { background: '#cfe2ff', color: '#084298' },
  reviewed: { background: '#d1e7dd', color: '#0a3622' },
  sent: { background: '#e9d7f5', color: '#560a7a' },
  // UserRole
  company_admin: { background: '#fff3cd', color: '#856404' },
  supervisor: { background: '#cfe2ff', color: '#084298' },
  worker: { background: '#e9ecef', color: '#495057' },
  // fallback
  default: { background: '#e9ecef', color: '#495057' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  style?: CSSProperties
}

export function Badge({ variant = 'default', children, style }: BadgeProps) {
  const colors = colorMap[variant] ?? colorMap.default
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        ...colors,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
