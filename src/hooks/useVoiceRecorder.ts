import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type VoiceRecorderPhase =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'error'

export const VOICE_RECORDER_MAX_SECONDS = 180 // 3-minute auto-stop
const LEVEL_BAR_COUNT = 5

/** Pick the best supported audio MIME type for MediaRecorder */
function detectMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
}

interface UseVoiceRecorderOptions {
  /** Called with the transcribed text once transcription succeeds. */
  onTranscribed: (text: string) => void
  maxSeconds?: number
}

export interface UseVoiceRecorderResult {
  phase: VoiceRecorderPhase
  error: string | null
  elapsed: number
  /**
   * Roughly `LEVEL_BAR_COUNT` values in the 0..1 range, sampled from the live
   * mic input while recording — meant to drive a small bar/level visualizer
   * so the user gets a real-time signal that their mic is actually picking
   * up sound, instead of a generic "recording" pulse. Flat/zero outside the
   * 'recording' phase, and silently stays flat (recording still works fine)
   * on browsers where the Web Audio API is unavailable.
   */
  levels: number[]
  startRecording: () => void
  stopRecording: () => void
  reset: () => void
}

/**
 * Shared voice-recording flow used by both the global record FAB
 * (GlobalRecordButton) and inline voice-note buttons (VoiceInput):
 * mic permission → record (with a live level meter) → stop → upload →
 * transcribe → hand the text back via `onTranscribed`.
 */
export function useVoiceRecorder({
  onTranscribed,
  maxSeconds = VOICE_RECORDER_MAX_SECONDS,
}: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const { user } = useAuth()

  const [phase, setPhase]     = useState<VoiceRecorderPhase>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels]   = useState<number[]>(() => new Array(LEVEL_BAR_COUNT).fill(0))

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const streamRef    = useRef<MediaStream | null>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef  = useRef<string>('')
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const rafRef       = useRef<number | null>(null)

  // Stable references so closures (recorder.onstop, rAF loop) always see
  // the latest values without needing to be re-created every render.
  const onTranscribedRef = useRef(onTranscribed)
  useEffect(() => { onTranscribedRef.current = onTranscribed }, [onTranscribed])
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  const stopLevelMeter = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setLevels(new Array(LEVEL_BAR_COUNT).fill(0))
  }, [])

  // Taps the same MediaStream MediaRecorder is using (via a separate,
  // non-destructive AnalyserNode — nothing is routed to speakers) to drive
  // a live amplitude bar meter while recording.
  const startLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return

      const audioCtx = new AudioCtx()
      const source   = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      audioCtxRef.current = audioCtx

      const data = new Uint8Array(analyser.frequencyBinCount)
      const chunk = Math.max(1, Math.floor(data.length / LEVEL_BAR_COUNT))

      const tick = () => {
        analyser.getByteFrequencyData(data)
        const bars: number[] = []
        for (let i = 0; i < LEVEL_BAR_COUNT; i++) {
          let sum = 0
          const start = i * chunk
          for (let j = start; j < start + chunk && j < data.length; j++) sum += data[j]
          const avg = sum / chunk / 255 // normalize to 0..1
          bars.push(Math.min(1, avg * 1.6)) // small boost so quieter speech still reads
        }
        setLevels(bars)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      // Web Audio unavailable/blocked — recording still works, meter just stays flat.
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      stopLevelMeter()
    }
  }, [stopLevelMeter])

  function startTimer() {
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= maxSeconds) {
          stopRecording()
          return e + 1
        }
        return e + 1
      })
    }, 1000)
  }

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // Main upload + transcription flow – invoked from recorder.onstop
  const handleStop = useCallback(async () => {
    const currentUser = userRef.current
    const blobs = chunksRef.current

    if (!currentUser || blobs.length === 0) {
      setPhase('idle')
      return
    }

    const mimeType = mimeTypeRef.current || 'audio/webm'
    const ext      = mimeType.includes('mp4') ? 'm4a'
                   : mimeType.includes('ogg') ? 'ogg'
                   : 'webm'
    const audioBlob = new Blob(blobs, { type: mimeType })
    const path      = `${currentUser.id}/${Date.now()}.${ext}`

    setPhase('uploading')

    try {
      const { error: uploadErr } = await supabase.storage
        .from('voice-recordings')
        .upload(path, audioBlob, { contentType: mimeType })

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      setPhase('transcribing')

      const { data, error: fnErr } = await supabase.functions.invoke('transcribe-audio', {
        body: { path },
      })

      if (fnErr) {
        // Try to pull the actual error message out of the response body
        let detail = fnErr.message
        try {
          // FunctionsHttpError exposes .context (the Response object)
          const ctx = (fnErr as unknown as { context?: Response }).context
          if (ctx) {
            const body = await ctx.json().catch(() => null)
            if (body?.error) detail = body.error as string
          }
        } catch { /* ignore parse errors */ }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(data.error as string)
      if (!data?.text) throw new Error('No transcription returned from server.')

      onTranscribedRef.current((data.text as string).trim())
      setPhase('idle')
    } catch (err: unknown) {
      // Best-effort cleanup if upload succeeded but transcription failed
      await supabase.storage.from('voice-recordings').remove([path]).catch(() => {})

      const msg = err instanceof Error ? err.message : 'Transcription failed. Please try again.'
      setError(msg)
      setPhase('error')
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    setPhase('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = detectMimeType()
      mimeTypeRef.current = mimeType

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = handleStop

      recorder.start(250) // emit chunks every 250 ms
      setPhase('recording')
      startTimer()
      startLevelMeter(stream)
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''
      const msg  = err instanceof Error ? err.message : 'Microphone error'

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.toLowerCase().includes('permission')) {
        setError('Microphone access was denied. Please allow access in your browser or device settings and try again.')
      } else if (name === 'NotFoundError') {
        setError('No microphone found on this device.')
      } else {
        setError(msg)
      }
      setPhase('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleStop, startLevelMeter])

  const stopRecording = useCallback(() => {
    clearTimer()
    stopLevelMeter()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [stopLevelMeter])

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
    setElapsed(0)
  }, [])

  return { phase, error, elapsed, levels, startRecording, stopRecording, reset }
}
