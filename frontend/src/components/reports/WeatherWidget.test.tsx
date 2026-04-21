import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/mocks/server'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { WeatherWidget } from './WeatherWidget'

const DATE = '2026-04-21'

function makeGeolocation(overrides?: Partial<GeolocationPosition['coords']>) {
  const coords: GeolocationCoordinates = {
    latitude: 48.137,
    longitude: 11.576,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    ...overrides,
  }
  return {
    getCurrentPosition: vi.fn((success: PositionCallback) =>
      success({ coords, timestamp: Date.now() } as GeolocationPosition),
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  }
}

function makeGeolocationDenied() {
  return {
    getCurrentPosition: vi.fn((_: PositionCallback, error: PositionErrorCallback) =>
      error({
        code: 1,
        message: 'User denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError),
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('WeatherWidget', () => {
  describe('GIVEN no coords yet WHEN widget renders', () => {
    it('SHOULD show only the "Wetter ermitteln" button', () => {
      vi.stubGlobal('navigator', { geolocation: makeGeolocation() })
      const onWeatherFetched = vi.fn()
      renderWithProviders(
        <WeatherWidget date={DATE} onWeatherFetched={onWeatherFetched} />,
      )

      expect(screen.getByRole('button', { name: /Wetter ermitteln|autoFill|Get weather/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Übernehmen|accept|Use this/i })).not.toBeInTheDocument()
    })
  })

  describe('GIVEN geolocation succeeds WHEN weather loads', () => {
    it('SHOULD display description and temperature', async () => {
      vi.stubGlobal('navigator', { geolocation: makeGeolocation() })
      const onWeatherFetched = vi.fn()
      renderWithProviders(
        <WeatherWidget date={DATE} onWeatherFetched={onWeatherFetched} />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Wetter ermitteln|autoFill|Get weather/i }))

      await waitFor(() => {
        expect(screen.getByText(/Sonnig/)).toBeInTheDocument()
      })
      expect(screen.getByText(/10.*20/)).toBeInTheDocument()
    })
  })

  describe('GIVEN geolocation succeeds WHEN "Übernehmen" clicked', () => {
    it('SHOULD call onWeatherFetched with correct args', async () => {
      vi.stubGlobal('navigator', { geolocation: makeGeolocation() })
      const onWeatherFetched = vi.fn()
      renderWithProviders(
        <WeatherWidget date={DATE} onWeatherFetched={onWeatherFetched} />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Wetter ermitteln|autoFill|Get weather/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Übernehmen|accept|Use this/i })).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: /Übernehmen|accept|Use this/i }))

      expect(onWeatherFetched).toHaveBeenCalledOnce()
      expect(onWeatherFetched).toHaveBeenCalledWith('Sonnig', '10° – 20°C')
    })
  })

  describe('GIVEN geolocation denied WHEN button clicked', () => {
    it('SHOULD show permissionDenied error message', async () => {
      vi.stubGlobal('navigator', { geolocation: makeGeolocationDenied() })
      const onWeatherFetched = vi.fn()
      renderWithProviders(
        <WeatherWidget date={DATE} onWeatherFetched={onWeatherFetched} />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Wetter ermitteln|autoFill|Get weather/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      expect(
        screen.getByText(/Standortzugriff verweigert|permissionDenied|Location access denied/i),
      ).toBeInTheDocument()
    })
  })

  describe('GIVEN API returns 502 WHEN weather loads', () => {
    it('SHOULD show unavailable error message', async () => {
      server.use(
        http.get('*/weather/', () =>
          HttpResponse.json({ error: 'Weather service unavailable' }, { status: 502 }),
        ),
      )

      vi.stubGlobal('navigator', { geolocation: makeGeolocation() })
      const onWeatherFetched = vi.fn()
      renderWithProviders(
        <WeatherWidget date={DATE} onWeatherFetched={onWeatherFetched} />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Wetter ermitteln|autoFill|Get weather/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      expect(
        screen.getByText(/Wetterdienst nicht verfügbar|unavailable|Weather service unavailable/i),
      ).toBeInTheDocument()
    })
  })
})
