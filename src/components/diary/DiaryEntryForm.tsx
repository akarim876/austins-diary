import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Save, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { DiaryEntry } from '../../types'
import { TagInput } from './TagInput'
import { PhotoUpload } from './PhotoUpload'
import { Spinner } from '../ui/Spinner'
import { getErrorMessage } from '../../lib/errors'

const schema = z.object({
  entry_date: z.string().min(1),
  note: z.string().max(10000),
  tags: z.array(z.string()),
  photo: z.instanceof(File).nullable().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  profileId: string
  date: string
  existingEntry: DiaryEntry | null
  /** Pre-fill the note field — used when opening from the global voice recorder */
  initialNote?: string
  onSaved: () => void
}

export function DiaryEntryForm({ profileId, date, existingEntry, initialNote, onSaved }: Props) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [clearExistingPhoto, setClearExistingPhoto] = useState(false)

  const { register, handleSubmit, control, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_date: date,
      // initialNote (when explicitly passed, e.g. from a voice transcription)
      // takes priority over the existing entry's note so callers can control
      // the starting text — e.g. a merged "existing note + new transcription"
      // string — while still passing the real existingEntry so saving updates
      // that row instead of inserting a duplicate.
      note: initialNote ?? existingEntry?.note ?? '',
      tags: existingEntry?.tags ?? [],
      photo: null,
    },
  })

  // Reset when date, entry, or initial note changes
  useEffect(() => {
    reset({
      entry_date: date,
      note: initialNote ?? existingEntry?.note ?? '',
      tags: existingEntry?.tags ?? [],
      photo: null,
    })
    setClearExistingPhoto(false)
  }, [date, existingEntry, initialNote, reset])

  const noteValue = watch('note')

  async function uploadPhoto(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user!.id}/${profileId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('diary-photos').upload(path, file)
    if (error) {
      console.error('Photo upload failed:', error)
      throw error
    }
    console.log('Photo uploaded, stored path:', path)
    return path
  }

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSubmitting(true)
    try {
      let photoUrl: string | null = existingEntry?.photo_url ?? null

      if (clearExistingPhoto) {
        photoUrl = null
      }

      if (values.photo) {
        photoUrl = await uploadPhoto(values.photo)
      }

      if (existingEntry) {
        const { error } = await supabase
          .from('diary_entries')
          .update({
            note: values.note,
            tags: values.tags,
            photo_url: photoUrl,
          })
          .eq('id', existingEntry.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('diary_entries').insert({
          profile_id: profileId,
          author_id: user.id,
          entry_date: values.entry_date,
          note: values.note,
          tags: values.tags,
          photo_url: photoUrl,
        })
        if (error) throw error
      }

      toast.success('Entry saved!')
      onSaved()
    } catch (err: unknown) {
      console.error('Save entry error:', err)
      toast.error(getErrorMessage(err, 'Failed to save entry'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!existingEntry) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', existingEntry.id)
      if (error) throw error
      toast.success('Entry deleted')
      onSaved()
    } catch (err: unknown) {
      console.error('Delete entry error:', err)
      toast.error(getErrorMessage(err, 'Failed to delete'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-4 pt-2 pb-6 space-y-5">
      {/* Date display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Entry for</p>
          <h2 className="text-lg font-bold text-gray-900">
            {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>
        {existingEntry && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-100 text-red-500 text-sm hover:bg-red-50 transition"
          >
            {deleting ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        )}
      </div>

      {/* Note */}
      <div>
        <label htmlFor="diary-note" className="block text-sm font-medium text-gray-700 mb-1.5">
          Today's note
        </label>
        <textarea
          id="diary-note"
          {...register('note')}
          rows={6}
          placeholder="How was today? What happened? How did Austin feel…"
          className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition leading-relaxed"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {noteValue?.length ?? 0} / 10,000
        </p>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="diary-tags" className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput id="diary-tags" value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Photo */}
      <div>
        <label id="diary-photo-label" className="block text-sm font-medium text-gray-700 mb-1.5">Photo</label>
        <Controller
          name="photo"
          control={control}
          render={({ field }) => (
            <div role="group" aria-labelledby="diary-photo-label">
              <PhotoUpload
                existingPath={clearExistingPhoto ? null : existingEntry?.photo_url}
                onChange={field.onChange}
                onClearExisting={() => setClearExistingPhoto(true)}
              />
            </div>
          )}
        />
      </div>

      {/* Hidden date field */}
      <input type="hidden" {...register('entry_date')} />

      {/* Save button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 active:bg-brand-700 transition disabled:opacity-60"
      >
        {submitting ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <>
            <Save className="w-4 h-4" />
            {existingEntry ? 'Update entry' : 'Save entry'}
          </>
        )}
      </button>
    </form>
  )
}
