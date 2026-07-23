import { useState, useCallback, useEffect } from 'react'
import { Mic, MicOff, Square, RotateCcw, X, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useVoiceRecorder, VOICE_RECORDER_MAX_SECONDS } from '../../hooks/useVoiceRecorder'
import { AudioLevelBars } from './AudioLevelBars'

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

const TIP_STORAGE_PREFIX = 'voice-tip-dismissed'

export function VoiceInput({ onTranscribed, disabled = false }: Props) {
  const { user } = useAuth()
  const [showTip, setShowTip] = useState(false)

  const { phase, error, elapsed, levels, startRecording, stopRecording, reset } =
    useVoiceRecorder({ onTranscribed })

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

  function handleStart() {
    dismissTip() // interacting counts as seeing the tip
    startRecording()
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
          onClick={handleStart}
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
    const nearMax = elapsed >= VOICE_RECORDER_MAX_SECONDS - 30
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ background: '#C77B6A' }}
      >
        {/* Live mic-level meter — confirms audio is actually being picked up */}
        <AudioLevelBars levels={levels} color="rgba(255,255,255,0.95)" minHeightPx={4} maxHeightPx={16} />
        <Square className="w-3.5 h-3.5 fill-current" />
        <span>Stop</span>
        <span
          className="tabular-nums text-xs font-medium opacity-90"
          style={{ fontFamily: 'inherit' }}
        >
          {formatTime(elapsed)}{nearMax ? ` / ${formatTime(VOICE_RECORDER_MAX_SECONDS)}` : ''}
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
