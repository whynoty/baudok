import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../tests/utils/renderWithProviders'
import { VoiceInput } from './VoiceInput'

describe('VoiceInput', () => {
  const onTranscript = vi.fn()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows unsupported message when SpeechRecognition is not available', () => {
    // Ensure SpeechRecognition is undefined
    const originalSpeech = (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition
    const originalWebkit = (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition
    delete (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition

    renderWithProviders(<VoiceInput onTranscript={onTranscript} />)

    // The i18n key fallback renders the key when translations aren't loaded
    expect(
      screen.getByText(/voiceNotSupported|nicht unterstützt|not supported/i)
    ).toBeInTheDocument()

    ;(window as Window & { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeech
    ;(window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkit
  })

  it('shows mic button when SpeechRecognition is available', () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onend: null,
    }
    const MockSpeechRecognition = vi.fn().mockImplementation(() => mockRecognition)
    ;(window as Window & { SpeechRecognition?: unknown }).SpeechRecognition =
      MockSpeechRecognition

    renderWithProviders(<VoiceInput onTranscript={onTranscript} />)

    // Button with voice start text should be present
    expect(screen.getByRole('button')).toBeInTheDocument()

    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition
  })

  describe('when SpeechRecognition is undefined', () => {
    beforeEach(() => {
      delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition
      delete (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    })

    it('does not render a mic button', () => {
      renderWithProviders(<VoiceInput onTranscript={onTranscript} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
