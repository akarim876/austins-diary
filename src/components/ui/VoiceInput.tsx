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
const TIP_STORAGE_PREFIX = 'voice-tip-dismissed'

export function VoiceInput({ onTranscribed, disabled = false }: Props) {
  const { user } = useAuth()

  const [phase, setPhase]     = useState<Phase>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showTip, setShowTip] = useState(false)

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

  const tipKey = user ? `${TIP_STORAGE_PREFIX}:${user.id}` : null

  // Show the one-time tip if this user hasn't seen it yet
  useEffect(() => {
    if (!tipKey) return
    try {
      if (!localStorage.getItem(tipKey)) setShowTip(true)
    } catch { /* localStorage unavailable */ }
  }, [tipKey])

  const dismissTip = useCallback(() => {
    setShowTip(false)
    if (!tipKey) return
    try { localStorage.setItem(tipKey, '1') } catch { /* ignore */ }
  }, [tipKey])

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
    dismissTip() // interacting counts as seeing the tip
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

  // ── One-time tooltip ─────────────────────────────────────────────────────────
  const tip = showTip && phase === 'idle' && (
    <div
      className="entry-appear relative flex items-start gap-2 mb-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-dim)' }}
      role="status"
    >
      <Mic className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
      <span className="flex-1 leading-relaxed">Tip: tap the mic to speak instead of type.</span>
      <button
        type="button"
        onClick={dismissTip}
        aria-label="Dismiss tip"
        className="flex-shrink-0 -mr-1 -mt-0.5 w-5 h-5 rounded-full flex items-center justify-center transition hover:bg-black/5"
      >
        <X className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
      </button>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div>
        {tip}
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ background: 'var(--color-accent)' }}
        >
          <Mic className="w-4 h-4" />
          Record note
        </button>
      </div>
    )
  }

  if (phase === 'requesting') {
    return (
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white select-none opacity-90"
        style={{ background: 'var(--color-accent)' }}
      >
        <Mic className="w-4 h-4 animate-pulse" />
        Requesting mic…
      </button>
    )
  }

  if (phase === 'recording') {
    const nearMax = elapsed >= MAX_SECONDS - 30
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ background: '#C77B6A' }}
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <Square className="w-3.5 h-3.5 fill-current" />
        <span>Stop</span>
        <span
          className="tabular-nums text-xs font-medium opacity-90"
          style={{ fontFamily: 'inherit' }}
        >
          {formatTime(elapsed)}{nearMax ? ` / ${formatTime(MAX_SECONDS)}` : ''}
        </span>
      </button>
    )
  }

  if (phase === 'uploading' || phase === 'transcribing') {
    return (
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white select-none opacity-90 cursor-wait"
        style={{ background: 'var(--color-accent)' }}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Transcribing…
      </button>
    )
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2">
        <div
          className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ color: '#C77B6A', background: 'rgba(199,123,106,0.09)' }}
        >
          <MicOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99] select-none"
            style={{ background: 'var(--color-accent)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition hover:bg-black/5 select-none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return null
}
