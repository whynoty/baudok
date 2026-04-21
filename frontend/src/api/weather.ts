import apiClient from './client'
import type { WeatherData } from './types'

export async function getWeather(lat: number, lon: number, date: string): Promise<WeatherData> {
  const response = await apiClient.get<WeatherData>('/weather/', {
    params: { lat, lon, date },
  })
  return response.data
}
