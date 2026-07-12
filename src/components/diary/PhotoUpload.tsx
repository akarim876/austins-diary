import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, X, ImageIcon } from 'lucide-react'
import { SecureImage } from '../ui/SecureImage'

interface PhotoUploadProps {
  /** Storage path of an already-saved photo, or null */
  existingPath?: string | null
  onChange: (file: File | null) => void
  onClearExisting?: () => void
}

export function PhotoUpload({ existingPath, onChange, onClearExisting }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onChange(file)
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

  function handleRemove() {
    onChange(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
    onClearExisting?.()
  }

  const hasImage = preview || existingPath

  return (
    <div>
      {hasImage ? (
        <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video">
          {preview ? (
            <img src={preview} alt="New photo preview" className="w-full h-full object-cover" />
          ) : (
            <SecureImage path={existingPath} alt="Diary photo" className="w-full h-full object-cover" />
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium hover:bg-black/70 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
            <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 group-hover:text-brand-600 transition-colors">
              Add a photo
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Tap to browse or take a photo</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
