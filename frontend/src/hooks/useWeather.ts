import { useQuery } from '@tanstack/react-query'
import { getWeather } from '../api/weather'

export function useWeather(
  lat: number | null,
  lon: number | null,
  date: string | null,
) {
  return useQuery({
    queryKey: ['weather', lat, lon, date],
    queryFn: () => getWeather(lat as number, lon as number, date as string),
    enabled: lat !== null && lon !== null && date !== null,
    staleTime: 10 * 60 * 1000,
  })
}
