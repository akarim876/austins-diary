/**
 * GlobalRecordButton — floating action button centered in the bottom nav.
 *
 * Flow:
 *  idle → tap → requesting mic → recording → stop → uploading → transcribing
 *  → done: show "Save to…" destination sheet
 *    ├── Behavior log  → BehaviorLogForm pre-filled with transcribed text
 *    ├── Handoff note  → Inline handoff editor pre-filled
 *    └── Quick note    → Save immediately as unfiled, toast confirmation
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Mic, Square, X, AlertCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../contexts/ProfileContext'
import { useMyRole, canCreate } from '../../hooks/useMyRole'
import { BottomSheet } from '../ui/BottomSheet'
import { BehaviorLogForm } from '../behavior/BehaviorLogForm'

type Phase = 'idle' | 'requesting' | 'recording' | 'uploading' | 'transcribing' | 'done' | 'error'
type Destination = 'behavior' | 'handoff' | 'quick' | null

function detectMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus', 'audio/webm',
    'audio/ogg;codecs=opus', 'audio/mp4',
  ]
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const MAX_SECONDS = 180

// ── Sub-component: HandoffSheet ───────────────────────────────────────────────

interface HandoffSheetProps {
  open: boolean
  onClose: () => void
  profileId: string
  initialText: string
}

function HandoffSheet({ open, onClose, profileId, initialText }: HandoffSheetProps) {
  const [text, setText]     = useState(initialText)
  const [saving, setSaving] = useState(false)

  // Reset text when opened with new content
  useEffect(() => { if (open) setText(initialText) }, [open, initialText])

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      await supabase.from('handoff_notes').upsert(
        { profile_id: profileId, note: text.trim(), updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'profile_id' },
      )
      toast.success('Handoff note saved')
      onClose()
    } catch {
      toast.error('Could not save handoff note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Handoff note">
      <div className="px-4 pt-3 pb-6 space-y-3">
        <p className="text-xs" style={{ color: '#9A9187' }}>
          Review and edit the transcription before saving.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 transition"
          style={{
            borderColor: 'rgba(91,123,122,0.25)',
            caretColor: '#5B7B7A',
          }}
          placeholder="Handoff note content…"
          autoFocus
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
          style={{ background: '#5B7B7A' }}
        >
          {saving ? 'Saving…' : 'Save handoff note'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GlobalRecordButton() {
  const { user }          = useAuth()
  const { activeProfile } = useProfile()
  const myRole            = useMyRole(activeProfile?.id ?? null)
  const today             = format(new Date(), 'yyyy-MM-dd')

  const [phase, setPhase]           = useState<Phase>('idle')
  const [elapsed, setElapsed]       = useState(0)
  const [error, setError]           = useState<string | null>(null)
  const [transcribed, setTranscribed] = useState<string | null>(null)
  const [destination, setDestination] = useState<Destination>(null)

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const streamRef    = useRef<MediaStream | null>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef  = useRef<string>('')
  const userRef      = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const profileId = activeProfile?.id ?? null
  const canLog    = canCreate(myRole)

  function startTimer() {
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e + 1 >= MAX_SECONDS) { stopRecording(); return e + 1 }
        return e + 1
      })
    }, 1000)
  }

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const handleStop = useCallback(async () => {
    const currentUser = userRef.current
    const blobs = chunksRef.current
    if (!currentUser || blobs.length === 0) { setPhase('idle'); return }

    const mimeType = mimeTypeRef.current || 'audio/webm'
    const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const audioBlob = new Blob(blobs, { type: mimeType })
    const path = `${currentUser.id}/${Date.now()}.${ext}`

    setPhase('uploading')

    try {
      const { error: uploadErr } = await supabase.storage
        .from('voice-recordings').upload(path, audioBlob, { contentType: mimeType })
      if (uploadErr) throw new Error(uploadErr.message)

      setPhase('transcribing')

      const { data, error: fnErr } = await supabase.functions.invoke('transcribe-audio', {
        body: { path },
      })

      if (fnErr) {
        let detail = fnErr.message
        try {
          const ctx = (fnErr as unknown as { context?: Response }).context
          if (ctx) { const b = await ctx.json().catch(() => null); if (b?.error) detail = b.error }
        } catch { /* ignore */ }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(data.error as string)
      if (!data?.text) throw new Error('No transcription returned')

      setTranscribed((data.text as string).trim())
      setPhase('done')
    } catch (err: unknown) {
      await supabase.storage.from('voice-recordings').remove([path]).catch(() => {})
      setError(err instanceof Error ? err.message : 'Transcription failed')
      setPhase('error')
    }
  }, [])

  async function startRecording() {
    if (!canLog) { toast.error('You need editor access to log entries.'); return }
    setError(null)
    setTranscribed(null)
    setPhase('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = detectMimeType()
      mimeTypeRef.current = mimeType

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = handleStop
      recorder.start(250)
      setPhase('recording')
      startTimer()
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''
      const msg  = err instanceof Error ? err.message : 'Microphone error'
      setError(
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Microphone access denied. Allow it in browser settings and try again.'
          : name === 'NotFoundError'
          ? 'No microphone found on this device.'
          : msg,
      )
      setPhase('error')
    }
  }

  function stopRecording() {
    clearTimer()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  function reset() {
    setPhase('idle')
    setError(null)
    setTranscribed(null)
    setDestination(null)
  }

  async function saveAsQuickNote() {
    if (!profileId || !user || !transcribed) return
    const { error } = await supabase
      .from('quick_notes')
      .insert({ profile_id: profileId, author_id: user.id, content: transcribed })
    if (error) { toast.error('Could not save quick note'); return }
    toast.success('Saved as quick note')
    reset()
  }

  // ── FAB visual ───────────────────────────────────────────────────────────────

  const isWorking = phase === 'uploading' || phase === 'transcribing'
  const isRecording = phase === 'recording'
  const isRequesting = phase === 'requesting'

  const fabBg = isRecording
    ? '#C77B6A'
    : phase === 'error'
    ? '#C77B6A'
    : '#5B7B7A'

  const fabLabel = isRecording
    ? formatTime(elapsed)
    : isRequesting
    ? '…'
    : isWorking
    ? ''
    : phase === 'error'
    ? '!'
    : ''

  function onFabClick() {
    if (phase === 'idle' || phase === 'error') startRecording()
    else if (phase === 'recording') stopRecording()
    // other phases: no-op (button disabled)
  }

  return (
    <>
      {/* ── FAB button ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={onFabClick}
          disabled={isWorking || isRequesting}
          aria-label={
            isRecording ? 'Stop recording' :
            isWorking   ? 'Processing…' :
                          'Start voice note'
          }
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 active:scale-95 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
          style={{
            background: fabBg,
            boxShadow:  isRecording
              ? '0 0 0 0 rgba(199,123,106,0.6), 0 4px 20px rgba(199,123,106,0.5)'
              : '0 4px 16px rgba(91,123,122,0.45), 0 2px 6px rgba(51,50,46,0.18)',
          }}
        >
          {/* Pulsing ring when recording */}
          {isRecording && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: 'rgba(199,123,106,0.35)' }}
            />
          )}

          {isWorking ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isRecording ? (
            <Square className="w-5 h-5 fill-current relative z-10" />
          ) : (
            <Mic className="w-6 h-6 relative z-10" />
          )}
        </button>

        {/* Sub-label: timer during recording, nothing otherwise */}
        <span
          className="text-[10px] font-semibold tabular-nums transition-colors"
          style={{
            color: isRecording ? '#C77B6A' : '#9A9187',
            fontFamily: isRecording ? '"JetBrains Mono", monospace' : 'inherit',
            minHeight: 14,
          }}
        >
          {fabLabel}
        </span>
      </div>

      {/* ── Error overlay (small, non-modal) ───────────────────────────── */}
      {phase === 'error' && error && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[70] flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-xl max-w-xs w-[90vw]"
          style={{
            bottom: 88,
            background: '#fff',
            border: '1.5px solid rgba(199,123,106,0.3)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#C77B6A' }} />
          <span className="text-xs leading-relaxed flex-1" style={{ color: '#33322E' }}>{error}</span>
          <div className="flex flex-col gap-1 ml-1">
            <button
              type="button"
              onClick={startRecording}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg transition"
              style={{ color: '#5B7B7A', background: 'rgba(91,123,122,0.10)' }}
            >
              <RotateCcw className="w-3 h-3 inline mr-0.5" />Retry
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-[10px] px-2 py-1 rounded-lg transition"
              style={{ color: '#9A9187' }}
            >
              <X className="w-3 h-3 inline mr-0.5" />Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Destination picker sheet ────────────────────────────────────── */}
      <BottomSheet
        open={phase === 'done' && destination === null}
        onClose={reset}
        title="Save your note to…"
      >
        <div className="px-4 pt-2 pb-6 space-y-3">
          {/* Transcription preview */}
          {transcribed && (
            <div
              className="px-3 py-2.5 rounded-xl text-sm leading-relaxed italic"
              style={{ background: 'rgba(91,123,122,0.07)', color: '#4A6564' }}
            >
              "{transcribed}"
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9A9187' }}>
            Choose destination
          </p>

          {/* Options */}
          {[
            {
              dest: 'behavior' as Destination,
              emoji: '🧠',
              label: 'Behavior log',
              sub: 'Pre-filled in the consequence field',
              color: 'rgba(240,196,90,0.12)',
              accent: '#c47a35',
            },
            {
              dest: 'handoff' as Destination,
              emoji: '📋',
              label: 'Handoff note',
              sub: 'Replaces today\'s handoff note',
              color: 'rgba(91,123,122,0.09)',
              accent: '#5B7B7A',
            },
            {
              dest: 'quick' as Destination,
              emoji: '📝',
              label: 'Quick note',
              sub: 'Saved unfiled on your dashboard',
              color: 'rgba(143,184,156,0.12)',
              accent: '#4a7c5c',
            },
          ].map(({ dest, emoji, label, sub, color, accent }) => (
            <button
              key={dest}
              type="button"
              onClick={() => {
                if (dest === 'quick') {
                  saveAsQuickNote()
                  // sheet closes via reset() after save
                } else {
                  setDestination(dest)
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all active:scale-[0.98]"
              style={{ background: color }}
            >
              <span className="text-xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#33322E' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: accent }}>{sub}</p>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={reset}
            className="w-full py-2.5 text-sm font-medium rounded-xl transition hover:bg-black/5"
            style={{ color: '#9A9187' }}
          >
            Discard
          </button>
        </div>
      </BottomSheet>

      {/* ── Behavior log sub-sheet ─────────────────────────────────────── */}
      {profileId && (
        <BottomSheet
          open={phase === 'done' && destination === 'behavior'}
          onClose={reset}
          title="Log behavior"
        >
          <BehaviorLogForm
            profileId={profileId}
            date={today}
            initialConsequence={transcribed ?? ''}
            onSaved={() => { toast.success('Behavior log saved'); reset() }}
            onCancel={reset}
          />
        </BottomSheet>
      )}

      {/* ── Handoff note sub-sheet ─────────────────────────────────────── */}
      {profileId && (
        <HandoffSheet
          open={phase === 'done' && destination === 'handoff'}
          onClose={reset}
          profileId={profileId}
          initialText={transcribed ?? ''}
        />
      )}
    </>
  )
}
