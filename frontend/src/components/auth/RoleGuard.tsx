import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'
import type { UserRole } from '../../api/types'

interface RoleGuardProps {
  roles: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

export default function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) return <>{fallback}</>
  return <>{children}</>
}
