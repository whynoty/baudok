import { useTranslation } from 'react-i18next'
import { Badge } from '../ui'
import type { ReportStatus } from '../../api/types'

interface ReportStatusBadgeProps {
  status: ReportStatus
}

export function ReportStatusBadge({ status }: ReportStatusBadgeProps) {
  const { t } = useTranslation()
  return <Badge variant={status}>{t(`report.status.${status}`)}</Badge>
}
