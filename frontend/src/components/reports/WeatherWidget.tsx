import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWeather } from '../../hooks/useWeather'
import { Button, Spinner } from '../ui'

interface WeatherWidgetProps {
  date: string
  onWeatherFetched: (description: string, temperature: string) => void
}

type GeoError = 'permissionDenied' | 'unavailable' | null

export function WeatherWidget({ date, onWeatherFetched }: WeatherWidgetProps) {
  const { t } = useTranslation()
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [geoError, setGeoError] = useState<GeoError>(null)
  const [dismissed, setDismissed] = useState(false)

  const { data, isLoading, isError } = useWeather(lat, lon, date)

  const handleGetWeather = () => {
    setGeoError(null)
    setDismissed(false)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude)
        setLon(position.coords.longitude)
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('permissionDenied')
        } else {
          setGeoError('unavailable')
        }
      },
    )
  }

  const handleAccept = () => {
    if (!data) return
    const tempString = `${Math.round(data.temperature_min)}° – ${Math.round(data.temperature_max)}${data.unit}`
    onWeatherFetched(data.description, tempString)
  }

  const showError = !dismissed && (geoError !== null || isError)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button type="button" onClick={handleGetWeather} disabled={isLoading}>
          {t('weather.autoFill')}
        </Button>

        {isLoading && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            <Spinner size={16} />
            {t('weather.loading')}
          </span>
        )}

        {data && !isLoading && (
          <span style={{ fontSize: '13px' }}>
            {data.description} · {Math.round(data.temperature_min)}° – {Math.round(data.temperature_max)}{data.unit}
          </span>
        )}

        {data && !isLoading && (
          <Button type="button" onClick={handleAccept}>
            {t('weather.accept')}
          </Button>
        )}
      </div>

      {showError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#f8d7da',
            border: '1px solid #f5c2c7',
            borderRadius: 'var(--radius)',
            color: 'var(--color-error)',
            fontSize: '13px',
          }}
        >
          <span>
            {geoError === 'permissionDenied'
              ? t('weather.permissionDenied')
              : t('weather.unavailable')}
          </span>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              color: 'var(--color-error)',
              padding: '0 0 0 8px',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
