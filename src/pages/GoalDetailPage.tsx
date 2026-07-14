import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Edit2, Plus } from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useProfile } from '../contexts/ProfileContext'
import { useGoal } from '../hooks/useGoals'
import { useProgressNotesForGoal } from '../hooks/useProgressNotes'
import { useProfileMembers } from '../hooks/useProfileMembers'
import { useMyRole, canCreate, canEditEntry } from '../hooks/useMyRole'
import { useAuth } from '../contexts/AuthContext'
import { GoalForm } from '../components/goals/GoalForm'
import { ProgressNoteForm } from '../components/goals/ProgressNoteForm'
import { ProgressNoteCard } from '../components/goals/ProgressNoteCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import { SOURCE_COLORS, statusMeta, ratingMeta, PROGRESS_RATINGS } from '../lib/goalConstants'
import type { GoalSource, ProgressNote, ProgressRating } from '../types'
import { format as formatDate } from 'date-fns'

export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const { user } = useAuth()
  const today = formatDate(new Date(), 'yyyy-MM-dd')
  const myRole = useMyRole(activeProfile?.id ?? null)
  const memberMap = useProfileMembers(activeProfile?.id ?? null)

  const { goal, loading: goalLoading, refetch: refetchGoal } = useGoal(id ?? null)
  const { notes, loading: notesLoading, refetch: refetchNotes } = useProgressNotesForGoal(id ?? null)

  const [editGoalOpen,       setEditGoalOpen]       = useState(false)
  const [progressFormOpen,   setProgressFormOpen]   = useState(false)
  const [editingNote,        setEditingNote]         = useState<ProgressNote | null>(null)

  const loading = goalLoading || notesLoading

  // Notes sorted newest-first for the list display
  const notesSorted = [...notes].sort((a, b) => b.note_date.localeCompare(a.note_date))

  // Notes oldest-first for the trend sparkline
  const notesTrend = notes  // already oldest-first from hook

  function canEditNote(note: ProgressNote) {
    return canEditEntry(myRole, note.author_id, note.note_date, user?.id, today)
  }

  if (loading && !goal) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-background)' }}>
        <Spinner className="w-8 h-8 text-brand-400" />
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: 'var(--color-background)' }}>
        <p className="text-gray-500">Goal not found</p>
        <button onClick={() => navigate('/goals')} className="text-brand-500 hover:underline text-sm">
          ← Back to goals
        </button>
      </div>
    )
  }

  const sm = statusMeta(goal.status)

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur border-b border-warm-200" style={{ background: 'var(--color-background-blur)' }}>
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition -ml-1"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-gray-600" />
            </button>
            <h1 className="flex-1 text-lg font-bold text-gray-900 leading-tight truncate">{goal.title}</h1>
            {canCreate(myRole) && (
              <button
                onClick={() => setEditGoalOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Goal summary card */}
        <div className="bg-white rounded-xl border border-warm-200 shadow-sm px-4 py-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[goal.source as GoalSource]}`}>
              {goal.source}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sm.color}`}>
              {sm.label}
            </span>
          </div>

          {goal.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{goal.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            <span>Started {format(parseISO(goal.start_date + 'T12:00:00'), 'MMM d, yyyy')}</span>
            {goal.target_date && (
              <span>Target {format(parseISO(goal.target_date + 'T12:00:00'), 'MMM d, yyyy')}</span>
            )}
          </div>
        </div>

        {/* Progress trend */}
        {notesTrend.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm px-4 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Progress trend · {notesTrend.length} note{notesTrend.length !== 1 ? 's' : ''}
            </p>

            {/* Sparkline dots */}
            <div className="flex items-end gap-1.5 h-10 mb-3 overflow-x-auto pb-1">
              {notesTrend.map((note) => {
                const rm = ratingMeta(note.rating as ProgressRating)
                const heightMap: Record<ProgressRating, number> = {
                  regression:      20,
                  no_change:       30,
                  slight_progress: 50,
                  good_progress:   70,
                  goal_met:        100,
                }
                const pct = heightMap[note.rating as ProgressRating] ?? 50
                return (
                  <div key={note.id} className="flex flex-col items-center gap-1 flex-shrink-0" title={`${rm.label} · ${format(parseISO(note.note_date + 'T12:00:00'), 'MMM d')}`}>
                    <div
                      className={`w-4 rounded-t-sm ${rm.dotColor} transition-all`}
                      style={{ height: `${(pct / 100) * 36}px` }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Rating legend */}
            <div className="flex flex-wrap gap-2">
              {PROGRESS_RATINGS.map(r => (
                <div key={r.value} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${r.dotColor}`} />
                  <span className="text-xs text-gray-400">{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress notes list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Progress notes
            </h2>
            {canCreate(myRole) && (
              <button
                onClick={() => { setEditingNote(null); setProgressFormOpen(true) }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-xs font-semibold hover:bg-brand-50 transition border border-brand-200"
              >
                <Plus className="w-3 h-3" />
                Log progress
              </button>
            )}
          </div>

          {notesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6 text-brand-400" />
            </div>
          ) : notesSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-white rounded-xl border border-warm-200">
              <ModuleIcon name="goals" className="w-8 h-8 text-brand-200 mb-2" />
              <p className="text-sm text-gray-400">No progress notes yet</p>
              {canCreate(myRole) && (
                <p className="text-xs text-gray-400 mt-1">Tap "Log progress" to add the first entry</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {notesSorted.map(note => (
                <ProgressNoteCard
                  key={note.id}
                  note={note}
                  goal={goal}
                  authorName={memberMap.get(note.author_id)}
                  onClick={canEditNote(note) ? () => { setEditingNote(note); setProgressFormOpen(true) } : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Goal Sheet */}
      <BottomSheet open={editGoalOpen} onClose={() => setEditGoalOpen(false)} title="Edit goal">
        <GoalForm
          profileId={activeProfile?.id ?? ''}
          existingGoal={goal}
          onSaved={() => { setEditGoalOpen(false); refetchGoal() }}
          onCancel={() => setEditGoalOpen(false)}
        />
      </BottomSheet>

      {/* Progress Note Sheet */}
      <BottomSheet
        open={progressFormOpen}
        onClose={() => { setProgressFormOpen(false); setEditingNote(null) }}
        title={editingNote ? 'Edit note' : 'Log progress'}
      >
        <ProgressNoteForm
          profileId={activeProfile?.id ?? ''}
          preselectedGoal={goal}
          existingNote={editingNote}
          onSaved={() => { setProgressFormOpen(false); setEditingNote(null); refetchNotes() }}
          onCancel={() => { setProgressFormOpen(false); setEditingNote(null) }}
        />
      </BottomSheet>
    </div>
  )
}
