import { formatDistanceToNow, parseISO } from 'date-fns'
import { FileText, Trash2 } from 'lucide-react'
import type { QuickNote } from '../../types'

interface Props {
  notes: QuickNote[]
  onDelete: (id: string) => void
}

export function UnfiledNotes({ notes, onDelete }: Props) {
  if (notes.length === 0) return null

  return (
    <div className="space-y-2">
      {notes.map(note => (
        <div
          key={note.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(91,123,122,0.06)' }}
        >
          <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {note.content}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {formatDistanceToNow(parseISO(note.created_at), { addSuffix: true })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            aria-label="Delete note"
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-black/6"
            style={{ color: '#C8C2BB' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
