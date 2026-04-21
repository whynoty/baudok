import { useQuery } from '@tanstack/react-query'
import { getAnalytics } from '../api/analytics'
import type { AnalyticsFilters } from '../api/analytics'

export function useAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', filters],
    queryFn: () => getAnalytics(filters),
    staleTime: 5 * 60 * 1000,
  })
}
