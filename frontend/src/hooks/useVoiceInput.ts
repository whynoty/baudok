import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface UseVoiceInputReturn {
  isListening: boolean
  transcript: string
  isSupported: boolean
  start: () => void
  stop: () => void
  clear: () => void
}

export function useVoiceInput(onTranscript?: (text: string) => void): UseVoiceInputReturn {
  const { i18n } = useTranslation()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ??
        (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
      : undefined

  const isSupported = Boolean(SpeechRecognitionAPI)

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = i18n.language
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript
      }
      if (final) {
        setTranscript((prev) => {
          const updated = prev ? prev + ' ' + final : final
          onTranscript?.(updated)
          return updated
        })
      }
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [SpeechRecognitionAPI, i18n.language, onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const clear = useCallback(() => setTranscript(''), [])

  return { isListening, transcript, isSupported, start, stop, clear }
}
