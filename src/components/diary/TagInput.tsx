import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

const PRESET_TAGS = [
  'good day', 'rough day', 'meltdown', 'school', 'therapy',
  'sleep issue', 'happy', 'calm', 'stimming', 'social',
]

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  id?: string
}

export function TagInput({ value, onChange, id }: TagInputProps) {
  const [input, setInput] = useState('')

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const suggestions = PRESET_TAGS.filter(
    t => !value.includes(t) && t.includes(input.toLowerCase())
  )

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-brand-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        id={id}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tags… (press Enter or comma)"
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition"
      />

      {/* Preset suggestions */}
      {input === '' && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 6).map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 text-xs hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
