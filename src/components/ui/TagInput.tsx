import { useRef, useState } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  disabled?: boolean
}

/**
 * Chip-style tag input. Press Enter or comma to add a tag.
 * Backspace on empty input removes the last tag.
 */
export function TagInput({
  tags,
  onChange,
  placeholder = 'Type and press Enter…',
  maxTags,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const value = raw.trim()
    if (!value) return
    if (maxTags && tags.length >= maxTags) return
    if (tags.map(t => t.toLowerCase()).includes(value.toLowerCase())) return
    onChange([...tags, value])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  const atMax = maxTags !== undefined && tags.length >= maxTags

  return (
    <div
      className={`min-h-[52px] px-3 py-2 border border-black/10 rounded-xl bg-[var(--color-surface)] flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-[var(--color-accent)]/30 transition-shadow ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(i) }}
              className="opacity-70 hover:opacity-100 transition-opacity"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
      {!atMax && !disabled && (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(input)}
          placeholder={tags.length === 0 ? placeholder : '+ add'}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
        />
      )}
    </div>
  )
}
