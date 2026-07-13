import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Square, RotateCcw, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

type Phase =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'error'

interface Props {
  /** Called with the transcribed text. Caller should append/set the field value. */
  onTranscribed: (text: string) => void
  disabled?: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

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

const MAX_SECONDS = 180 // 3-minute auto-stop

export function VoiceInput({ onTranscribed, disabled = false }: Props) {
  const { user } = useAuth()

  const [phase, setPhase]     = useState<Phase>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const streamRef    = useRef<MediaStream | null>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef  = useRef<string>('')

  // Stable reference so onstop closure always sees latest user / onTranscribed
  const onTranscribedRef = useRef(onTranscribed)
  useEffect(() => { onTranscribedRef.current = onTranscribed }, [onTranscribed])
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  function startTimer() {
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= MAX_SECONDS) {
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

  // Main transcription flow – invoked from recorder.onstop
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

  async function startRecording() {
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
  }

  function stopRecording() {
    clearTimer()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  function reset() {
    setPhase('idle')
    setError(null)
    setElapsed(0)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        title="Tap to dictate"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed select-none"
        style={{ color: '#5B7B7A', background: 'rgba(91,123,122,0.09)' }}
      >
        <Mic className="w-3.5 h-3.5" />
        Dictate
      </button>
    )
  }

  if (phase === 'requesting') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs" style={{ color: '#9A9187' }}>
        <Mic className="w-3.5 h-3.5 animate-pulse" />
        <span>Requesting mic…</span>
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="flex items-center gap-2">
        {/* Pulsing indicator + elapsed */}
        <span
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium"
          style={{ color: '#C77B6A', background: 'rgba(199,123,106,0.10)' }}
        >
          <Mic className="w-3.5 h-3.5 animate-pulse" style={{ color: '#C77B6A' }} />
          {formatTime(elapsed)}
          {elapsed >= MAX_SECONDS - 30 && (
            <span className="ml-1 text-[10px] opacity-70">max {formatTime(MAX_SECONDS)}</span>
          )}
        </span>
        {/* Stop button */}
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white transition hover:opacity-90 active:scale-95 select-none"
          style={{ background: '#C77B6A' }}
        >
          <Square className="w-3 h-3 fill-current" />
          Stop
        </button>
      </div>
    )
  }

  if (phase === 'uploading' || phase === 'transcribing') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs" style={{ color: '#9A9187' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{phase === 'uploading' ? 'Uploading…' : 'Transcribing…'}</span>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="space-y-1.5">
        <div
          className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl text-xs"
          style={{ color: '#C77B6A', background: 'rgba(199,123,106,0.09)' }}
        >
          <MicOff className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition hover:opacity-80 select-none"
            style={{ color: '#5B7B7A', background: 'rgba(91,123,122,0.09)' }}
          >
            <RotateCcw className="w-3 h-3" />
            Try again
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 px-2 py-1 rounded-xl text-xs transition hover:opacity-80 select-none"
            style={{ color: '#9A9187' }}
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return null
}
