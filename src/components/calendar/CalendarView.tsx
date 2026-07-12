import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, format, isSameMonth, isToday,
  addMonths, subMonths, isSameDay, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Appointment, DiaryEntry, BehaviorLog, SensoryLog, DietLog, SleepLog, ProgressNote } from '../../types'

interface Props {
  entries: DiaryEntry[]
  behaviorLogs: BehaviorLog[]
  sensoryLogs: SensoryLog[]
  dietLogs: DietLog[]
  sleepLogs: SleepLog[]
  progressNotes: ProgressNote[]
  appointments: Appointment[]
  selectedDate: string
  onSelectDate: (date: string) => void
}

export function CalendarView({ entries, behaviorLogs, sensoryLogs, dietLogs, sleepLogs, progressNotes, appointments, selectedDate, onSelectDate }: Props) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? parseISO(selectedDate) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const entryDates    = new Set(entries.map(e => e.entry_date))
  const behaviorDates = new Set(behaviorLogs.map(l => l.entry_date))
  const sensoryDates  = new Set(sensoryLogs.map(l => l.entry_date))
  const dietDates     = new Set(dietLogs.map(l => l.entry_date))
  const sleepDates    = new Set(sleepLogs.map(l => l.log_date))
  const progressDates    = new Set(progressNotes.map(n => n.note_date))
  const appointmentDates = new Set(appointments.map(a => a.appt_date))
  const followupDates    = new Set(
    appointments
      .filter(a => a.followup_needed && a.followup_date)
      .map(a => a.followup_date!)
  )

  const monthStart = startOfMonth(viewMonth)
  const monthEnd   = endOfMonth(viewMonth)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const selected   = selectedDate ? parseISO(selectedDate) : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-warm-200 overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200">
        <button
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="w-8 h-8 rounded-xl hover:bg-warm-100 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="font-semibold text-gray-900 text-sm">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="w-8 h-8 rounded-xl hover:bg-warm-100 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-warm-200">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateStr        = format(day, 'yyyy-MM-dd')
          const hasEntry       = entryDates.has(dateStr)
          const hasBehavior    = behaviorDates.has(dateStr)
          const hasSensory     = sensoryDates.has(dateStr)
          const hasDiet        = dietDates.has(dateStr)
          const hasSleep       = sleepDates.has(dateStr)
          const hasProgress    = progressDates.has(dateStr)
          const hasAppointment = appointmentDates.has(dateStr)
          const hasFollowup    = followupDates.has(dateStr)
          const isSelected     = selected ? isSameDay(day, selected) : false
          const isCurrentMonth = isSameMonth(day, viewMonth)
          const isTodayDate    = isToday(day)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative flex flex-col items-center justify-center py-2.5 transition-all
                ${!isCurrentMonth ? 'opacity-30' : 'hover:bg-warm-100'}
                ${isSelected ? 'bg-brand-500 hover:bg-brand-600' : ''}
              `}
            >
              <span className={`text-sm font-medium leading-none ${
                isSelected ? 'text-white' : isTodayDate ? 'text-brand-600' : 'text-gray-700'
              }`}>
                {format(day, 'd')}
              </span>

              {/* Indicator dots */}
              {(hasEntry || hasBehavior || hasSensory || hasDiet || hasSleep || hasProgress || hasAppointment || hasFollowup) && (
                <div className="flex gap-0.5 mt-1">
                  {hasEntry && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-brand-400'}`} />
                  )}
                  {hasBehavior && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500'}`} />
                  )}
                  {hasSensory && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-violet-200' : 'bg-violet-500'}`} />
                  )}
                  {hasDiet && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-emerald-200' : 'bg-emerald-500'}`} />
                  )}
                  {hasSleep && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-indigo-200' : 'bg-indigo-500'}`} />
                  )}
                  {hasProgress && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-teal-200' : 'bg-teal-500'}`} />
                  )}
                  {hasAppointment && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-rose-200' : 'bg-rose-500'}`} />
                  )}
                  {hasFollowup && (
                    <span className={`w-1 h-1 rounded-full ring-1 ${
                      isSelected
                        ? 'bg-orange-200 ring-orange-300'
                        : 'bg-orange-100 ring-orange-400'
                    }`} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-warm-200 bg-warm-50 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-400" />
          <span className="text-xs text-gray-500">Diary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs text-gray-500">Behavior</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-xs text-gray-500">Sensory</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-500">Diet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs text-gray-500">Sleep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-xs text-gray-500">Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-xs text-gray-500">Appt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full ring-1 ring-orange-400 bg-orange-100" />
          <span className="text-xs text-gray-500">Follow-up</span>
        </div>
      </div>
    </div>
  )
}
