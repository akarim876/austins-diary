import { format, parseISO } from 'date-fns'
import { ImageIcon, User } from 'lucide-react'
import type { DiaryEntry } from '../../types'
import { SecureImage } from '../ui/SecureImage'

interface Props {
  entry: DiaryEntry
  authorName?: string
  onClick: () => void
}

export function EntryPreviewCard({ entry, authorName, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-warm-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all overflow-hidden"
    >
      {entry.photo_url && (
        <div className="aspect-video w-full overflow-hidden bg-gray-100">
          <SecureImage
            path={entry.photo_url}
            alt="Diary photo"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {format(parseISO(entry.entry_date), 'EEE, MMM d')}
          </p>
          {entry.photo_url && (
            <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
          )}
        </div>
        {entry.note && (
          <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
            {entry.note}
          </p>
        )}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {entry.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {authorName && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            <User className="w-3 h-3" /> Logged by {authorName}
          </div>
        )}
      </div>
    </button>
  )
}
