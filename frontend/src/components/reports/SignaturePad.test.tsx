import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../tests/mocks/server'
import { mockSignature } from '../../tests/mocks/handlers'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { SignaturePad } from './SignaturePad'

const REPORT_ID = 'report-uuid-1'

// HTMLCanvasElement.toDataURL is not implemented in jsdom — stub it
beforeAll(() => {
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => mockSignature.signature_image)
  // getContext returns null in jsdom; provide a minimal 2d stub so the component
  // can call fillRect / beginPath / etc. without throwing
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext
})

function renderPad(onSigned = vi.fn()) {
  return renderWithProviders(<SignaturePad reportId={REPORT_ID} onSigned={onSigned} />)
}

describe('SignaturePad', () => {
  describe('GIVEN blank canvas WHEN component renders', () => {
    it('SHOULD disable the "Unterschreiben" button', () => {
      renderPad()
      const signButton = screen.getByRole('button', { name: /Unterschreiben|Sign|Firmar|Firmare|Assinar/i })
      expect(signButton).toBeDisabled()
    })
  })

  describe('GIVEN user draws on canvas WHEN "Unterschreiben" clicked', () => {
    it('SHOULD call the POST endpoint and invoke onSigned on success', async () => {
      const onSigned = vi.fn()
      renderPad(onSigned)

      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      fireEvent.pointerDown(canvas)

      const signButton = screen.getByRole('button', { name: /Unterschreiben|Sign|Firmar|Firmare|Assinar/i })
      expect(signButton).not.toBeDisabled()

      fireEvent.click(signButton)

      await waitFor(() => {
        expect(onSigned).toHaveBeenCalledOnce()
      })
    })
  })

  describe('GIVEN a 409 response WHEN submit', () => {
    it('SHOULD show the alreadySigned inline message', async () => {
      server.use(
        http.post('*/reports/*/signatures/', () =>
          HttpResponse.json({ error: 'Signature already exists for this role' }, { status: 409 })
        )
      )

      renderPad()

      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      fireEvent.pointerDown(canvas)

      const signButton = screen.getByRole('button', { name: /Unterschreiben|Sign|Firmar|Firmare|Assinar/i })
      fireEvent.click(signButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      expect(
        screen.getByText(/bereits unterschrieben|already signed|ya ha firmado|già firmato|já assinou/i)
      ).toBeInTheDocument()
    })
  })

  describe('GIVEN successful submit WHEN done', () => {
    it('SHOULD call onSigned callback', async () => {
      const onSigned = vi.fn()
      renderPad(onSigned)

      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      fireEvent.pointerDown(canvas)

      const signButton = screen.getByRole('button', { name: /Unterschreiben|Sign|Firmar|Firmare|Assinar/i })
      fireEvent.click(signButton)

      await waitFor(() => {
        expect(onSigned).toHaveBeenCalledOnce()
      })
    })
  })

  describe('GIVEN "Löschen" clicked WHEN canvas has a drawing', () => {
    it('SHOULD reset hasDrawn so "Unterschreiben" becomes disabled again', () => {
      renderPad()

      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      fireEvent.pointerDown(canvas)

      const signButton = screen.getByRole('button', { name: /Unterschreiben|Sign|Firmar|Firmare|Assinar/i })
      expect(signButton).not.toBeDisabled()

      const clearButton = screen.getByRole('button', { name: /Löschen|Clear|Borrar|Cancella|Limpar/i })
      fireEvent.click(clearButton)

      expect(signButton).toBeDisabled()
    })
  })
})
