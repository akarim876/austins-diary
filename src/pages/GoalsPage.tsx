import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown } from 'lucide-react'
import { ModuleIcon } from '../components/ui/ModuleIcon'
import { useProfile } from '../contexts/ProfileContext'
import { useGoals } from '../hooks/useGoals'
import { useProgressNotes } from '../hooks/useProgressNotes'
import { useMyRole, canCreate } from '../hooks/useMyRole'
import { GoalCard } from '../components/goals/GoalCard'
import { GoalForm } from '../components/goals/GoalForm'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Spinner } from '../components/ui/Spinner'
import { GOAL_SOURCES } from '../lib/goalConstants'
import type { GoalSource, GoalStatus } from '../types'

const STATUS_TABS: Array<{ value: GoalStatus | 'all'; label: string }> = [
  { value: 'all',          label: 'All'          },
  { value: 'active',       label: 'Active'       },
  { value: 'on_hold',      label: 'On hold'      },
  { value: 'achieved',     label: 'Achieved'     },
  { value: 'discontinued', label: 'Discontinued' },
]

export function GoalsPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const myRole = useMyRole(activeProfile?.id ?? null)

  const { goals, loading, refetch } = useGoals(activeProfile?.id ?? null)
  const { notes } = useProgressNotes(activeProfile?.id ?? null)

  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('active')
  const [sourceFilter, setSourceFilter] = useState<GoalSource | 'all'>('all')
  const [showSourceFilter, setShowSourceFilter] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  // Count of progress notes per goal
  const countsByGoal = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of notes) {
      m.set(n.goal_id, (m.get(n.goal_id) ?? 0) + 1)
    }
    return m
  }, [notes])

  const filtered = useMemo(() => goals.filter(g => {
    if (statusFilter !== 'all' && g.status !== statusFilter) return false
    if (sourceFilter !== 'all' && g.source !== sourceFilter) return false
    return true
  }), [goals, statusFilter, sourceFilter])

  if (!activeProfile) return null

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const g of goals) {
      m[g.status] = (m[g.status] ?? 0) + 1
    }
    return m
  }, [goals])

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur border-b border-warm-200" style={{ background: 'rgba(247,245,241,0.95)' }}>
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
                <ModuleIcon name="goals" className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Goals</h1>
            </div>
            {canCreate(myRole) && (
              <button
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                New goal
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  statusFilter === tab.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.value !== 'all' && statusCounts[tab.value] > 0 && (
                  <span className={`ml-1 text-xs ${statusFilter === tab.value ? 'text-brand-200' : 'text-gray-400'}`}>
                    {statusCounts[tab.value]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Source filter (collapsible) */}
          <button
            onClick={() => setShowSourceFilter(v => !v)}
            className="flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-700 transition"
          >
            Filter by source
            {sourceFilter !== 'all' && (
              <span className="ml-1 px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded-full font-semibold">{sourceFilter}</span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSourceFilter ? 'rotate-180' : ''}`} />
          </button>
          {showSourceFilter && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  sourceFilter === 'all'
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                All
              </button>
              {GOAL_SOURCES.map(s => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    sourceFilter === s
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-7 h-7 text-brand-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
              <ModuleIcon name="goals" className="w-7 h-7 text-brand-400" />
            </div>
            {goals.length === 0 ? (
              <>
                <p className="font-semibold text-gray-700">No goals yet</p>
                {canCreate(myRole) && (
                  <p className="text-sm text-gray-400 mt-1">Tap "New goal" to add the first one</p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700">No goals match these filters</p>
                <button
                  onClick={() => { setStatusFilter('all'); setSourceFilter('all') }}
                  className="text-sm text-brand-500 mt-1 hover:underline"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progressCount={countsByGoal.get(goal.id)}
              onClick={() => navigate(`/goals/${goal.id}`)}
            />
          ))
        )}
      </div>

      {/* Goal Form Sheet */}
      <BottomSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New goal"
      >
        <GoalForm
          profileId={activeProfile.id}
          onSaved={() => { setFormOpen(false); refetch() }}
          onCancel={() => setFormOpen(false)}
        />
      </BottomSheet>
    </div>
  )
}
