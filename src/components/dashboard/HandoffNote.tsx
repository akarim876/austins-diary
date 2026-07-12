import { useState, useRef, useEffect } from 'react'
import { differenceInHours, formatDistanceToNow, parseISO } from 'date-fns'
import { AlertTriangle, Check, Pencil, StickyNote, X } from 'lucide-react'
import { canCreate } from '../../hooks/useMyRole'
import type { ProfileRole } from '../../hooks/useMyRole'
import type { HandoffNoteData } from '../../hooks/useHandoffNote'

interface Props {
  data:         HandoffNoteData | null
  updaterName:  string | null
  myRole:       ProfileRole | null
  onSave:       (text: string) => Promise<void>
}

export function HandoffNote({ data, updaterName, myRole, onSave }: Props) {
  const [editing, setEditing]   = useState(false)
  const [text, setText]         = useState(data?.note ?? '')
  const [saving, setSaving]     = useState(false)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  const canEdit = canCreate(myRole)
  const isEmpty = !data || !data.note.trim()

  const isStale = data?.updated_at
    ? differenceInHours(new Date(), parseISO(data.updated_at)) >= 24
    : false

  // Auto-resize textarea
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      textareaRef.current.focus()
    }
  }, [editing, text])

  function startEdit() {
    setText(data?.note ?? '')
    setEditing(true)
  }

  function handleCancel() {
    setText(data?.note ?? '')
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(text.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  // Keyboard shortcut: Cmd/Ctrl+Enter to save
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const updatedAgo = data?.updated_at
    ? formatDistanceToNow(parseISO(data.updated_at), { addSuffix: true })
    : null

  return (
    <div
      className="rounded-xl overflow-hidden transition-opacity"
      style={{
        background:   '#fff',
        border:       '1px solid rgba(91,123,122,0.25)',
        borderLeft:   '4px solid #5B7B7A',
        boxShadow:    '0 2px 12px rgba(51,50,46,0.08)',
        opacity:      isStale && !editing ? 0.72 : 1,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(91,123,122,0.10)', background: 'rgba(91,123,122,0.04)' }}
      >
        <div className="flex items-center gap-2">
          <StickyNote className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5B7B7A' }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#5B7B7A' }}>
            Handoff note
          </span>
          {isStale && !editing && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(217,154,108,0.15)', color: '#c47a35' }}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              May be outdated
            </span>
          )}
        </div>

        {canEdit && (
          editing ? (
            <button
              onClick={handleCancel}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              title="Discard"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          ) : (
            <button
              onClick={startEdit}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ color: '#5B7B7A' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91,123,122,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="Edit handoff note"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        {editing ? (
          <>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What should today's caregiver know? e.g. 'Had a rough morning, avoiding transitions. Needs snack by 3pm.'"
              className="w-full text-sm leading-relaxed resize-none bg-transparent outline-none"
              style={{
                color:           '#33322E',
                minHeight:       72,
                caretColor:      '#5B7B7A',
                fontFamily:      'Inter, sans-serif',
              }}
              rows={3}
            />
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px]" style={{ color: '#9A9187' }}>⌘ Enter to save</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 rounded-full text-xs font-semibold text-gray-500 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white transition disabled:opacity-60"
                  style={{ background: '#5B7B7A' }}
                >
                  <Check className="w-3 h-3" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </>
        ) : isEmpty ? (
          canEdit ? (
            <button
              onClick={startEdit}
              className="w-full text-left py-1.5 text-sm transition-colors"
              style={{ color: '#C8C2BB' }}
            >
              Tap to add a handoff note…
            </button>
          ) : (
            <p className="py-1.5 text-sm" style={{ color: '#C8C2BB' }}>No handoff note for today.</p>
          )
        ) : (
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: '#33322E', cursor: canEdit ? 'text' : 'default' }}
            onClick={canEdit ? startEdit : undefined}
          >
            {data!.note}
          </p>
        )}

        {/* Attribution line */}
        {!isEmpty && !editing && updatedAgo && (
          <p className="text-[11px] mt-2" style={{ color: '#9A9187' }}>
            Updated{updaterName ? ` by ${updaterName}` : ''}, {updatedAgo}
          </p>
        )}
      </div>
    </div>
  )
}
