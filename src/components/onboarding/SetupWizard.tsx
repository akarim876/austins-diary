import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, X, Check, Plus, Trash2, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TagInput } from '../ui/TagInput'
import { TRACKER_COLORS, TRACKER_TYPE_OPTIONS } from '../../lib/trackerIcons'
import type { TrackerType } from '../../types'
import { useStepTransition } from '../../hooks/useStepTransition'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SetupWizardProps {
  profileId: string
  profileName: string
  userId: string
  initialStep?: number
  onClose: (currentStep: number) => void
  onComplete: () => void
}

interface NewTracker {
  name: string
  type: TrackerType
  color: string
}

interface NewScheduleItem {
  label: string
  time: string
}

// ─── Shared step shell ───────────────────────────────────────────────────────

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
        {subtitle && (
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)] leading-relaxed">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
      {children}
      {optional && <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">(optional)</span>}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 border border-black/10 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 transition-shadow"
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3.5 py-2.5 border border-black/10 rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 resize-none transition-shadow"
    />
  )
}

// ─── Step 0: Intro ───────────────────────────────────────────────────────────

function IntroStep({
  displayName,
  onGetStarted,
}: {
  displayName: string
  onGetStarted: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-[var(--color-accent)]" />
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          About {displayName === 'your family' ? "your family's diary" : `${displayName}'s Diary`}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-xs mx-auto">
          This is {displayName}'s story, kept close. A place to notice the small wins, understand
          the hard moments, and hold onto the details that matter — the things that comfort them,
          the things that overwhelm them, and the strategies that actually help.
        </p>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-xs mx-auto">
          Built so that anyone caring for {displayName}, in any moment, can step in knowing what
          they need. Everything here stays private, just for the people who love them.
        </p>
      </div>

      <div className="w-full space-y-2 pt-2">
        <button
          onClick={onGetStarted}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Get started
        </button>
        <button
          onClick={onGetStarted}
          className="w-full py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Skip intro
        </button>
      </div>
    </div>
  )
}

// ─── Step 1: Child Info ───────────────────────────────────────────────────────

function ChildInfoStep({
  profileId,
  profileName,
  onSaved,
  onSkip,
}: {
  profileId: string
  profileName: string
  onSaved: (newName: string) => void
  onSkip: () => void
}) {
  const [name, setName] = useState(profileName)
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('child_profiles')
      .select('name, birth_date')
      .eq('id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? profileName)
          setBirthDate((data as { birth_date?: string | null }).birth_date ?? '')
        }
      })
  }, [profileId, profileName])

  async function handleSave() {
    setSaving(true)
    await (supabase.from('child_profiles') as any)
      .update({ name: name.trim() || profileName, birth_date: birthDate || null })
      .eq('id', profileId)
    setSaving(false)
    onSaved(name.trim() || profileName)
  }

  return (
    <StepShell
      title="About the child"
      subtitle="Enter their name and date of birth. This helps personalize the diary and calculate age for reports."
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Name</FieldLabel>
          <TextInput value={name} onChange={setName} placeholder="Child's name" />
        </div>
        <div>
          <FieldLabel optional>Date of birth</FieldLabel>
          <TextInput value={birthDate} onChange={setBirthDate} type="date" />
        </div>
      </div>

      <StepFooterInline
        onNext={handleSave}
        onSkip={onSkip}
        saving={saving}
        nextLabel="Save & continue"
      />
    </StepShell>
  )
}

// ─── Step 2: Care Notes ──────────────────────────────────────────────────────

function CareNotesStep({
  profileId,
  userId,
  onSaved,
  onSkip,
}: {
  profileId: string
  userId: string
  onSaved: () => void
  onSkip: () => void
}) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(supabase.from('handoff_notes') as any)
      .select('content')
      .eq('profile_id', profileId)
      .maybeSingle()
      .then(({ data }: { data: { content: string } | null }) => {
        if (data?.content) setNotes(data.content)
      })
  }, [profileId])

  async function handleSave() {
    if (!notes.trim()) { onSaved(); return }
    setSaving(true)
    await (supabase.from('handoff_notes') as any)
      .upsert(
        {
          profile_id: profileId,
          content: notes.trim(),
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )
    setSaving(false)
    onSaved()
  }

  return (
    <StepShell
      title="Key care notes"
      subtitle="Add any allergies, medical notes, or behavioral context that every caregiver should know. This will appear as the pinned Handoff Note on the dashboard."
    >
      <Textarea
        value={notes}
        onChange={setNotes}
        placeholder={`Known allergies: peanuts, dairy\n\nBehavioral notes: responds well to visual schedules, needs transition warnings…`}
        rows={7}
      />
      <StepFooterInline
        onNext={handleSave}
        onSkip={onSkip}
        saving={saving}
        nextLabel={notes.trim() ? 'Save & continue' : 'Continue'}
      />
    </StepShell>
  )
}

// ─── Step 3: Food List ───────────────────────────────────────────────────────

function FoodListStep({
  profileId,
  onSaved,
  onSkip,
}: {
  profileId: string
  onSaved: () => void
  onSkip: () => void
}) {
  const [foods, setFoods] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('diet_settings')
      .select('accepted_foods')
      .eq('profile_id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.accepted_foods && Array.isArray(data.accepted_foods)) {
          setFoods(data.accepted_foods as string[])
        }
      })
  }, [profileId])

  async function handleSave() {
    setSaving(true)
    const { data: existing } = await supabase
      .from('diet_settings')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()
    await supabase.from('diet_settings').upsert(
      { ...(existing ?? {}), profile_id: profileId, accepted_foods: foods },
      { onConflict: 'profile_id' }
    )
    setSaving(false)
    onSaved()
  }

  return (
    <StepShell
      title="Accepted foods"
      subtitle="Add the foods they regularly eat. These appear as options when logging meals. Type an item and press Enter."
    >
      <TagInput
        tags={foods}
        onChange={setFoods}
        placeholder="Chicken, rice, apples…"
      />
      <p className="text-xs text-[var(--color-text-muted)]">
        {foods.length} food{foods.length !== 1 ? 's' : ''} added · you can always edit this in Diet Settings
      </p>
      <StepFooterInline
        onNext={handleSave}
        onSkip={onSkip}
        saving={saving}
        nextLabel="Save & continue"
      />
    </StepShell>
  )
}

// ─── Step 4: Medications & Supplements ──────────────────────────────────────

function MedsStep({
  profileId,
  onSaved,
  onSkip,
}: {
  profileId: string
  onSaved: () => void
  onSkip: () => void
}) {
  const [medications, setMedications] = useState<string[]>([])
  const [supplements, setSupplements] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('diet_settings')
      .select('medications, supplements')
      .eq('profile_id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (Array.isArray(data.medications)) setMedications(data.medications as string[])
          if (Array.isArray(data.supplements)) setSupplements(data.supplements as string[])
        }
      })
  }, [profileId])

  async function handleSave() {
    setSaving(true)
    const { data: existing } = await supabase
      .from('diet_settings')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()
    await supabase.from('diet_settings').upsert(
      { ...(existing ?? {}), profile_id: profileId, medications, supplements },
      { onConflict: 'profile_id' }
    )
    setSaving(false)
    onSaved()
  }

  return (
    <StepShell
      title="Medications & supplements"
      subtitle="Add medications and supplements so they appear as quick options when logging. Type each one and press Enter."
    >
      <div className="space-y-4">
        <div>
          <FieldLabel optional>Medications</FieldLabel>
          <TagInput
            tags={medications}
            onChange={setMedications}
            placeholder="Melatonin 3mg, Vitamin D…"
          />
        </div>
        <div>
          <FieldLabel optional>Supplements</FieldLabel>
          <TagInput
            tags={supplements}
            onChange={setSupplements}
            placeholder="Omega-3, Magnesium…"
          />
        </div>
      </div>
      <StepFooterInline
        onNext={handleSave}
        onSkip={onSkip}
        saving={saving}
        nextLabel="Save & continue"
      />
    </StepShell>
  )
}

// ─── Step 5: Smoothie Ingredients ────────────────────────────────────────────

function SmoothiesStep({
  profileId,
  onSaved,
  onSkip,
}: {
  profileId: string
  onSaved: () => void
  onSkip: () => void
}) {
  const [morning, setMorning] = useState<string[]>([])
  const [evening, setEvening] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('diet_settings')
      .select('morning_ingredients, evening_ingredients')
      .eq('profile_id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (Array.isArray(data.morning_ingredients)) setMorning(data.morning_ingredients as string[])
          if (Array.isArray(data.evening_ingredients)) setEvening(data.evening_ingredients as string[])
        }
      })
  }, [profileId])

  async function handleSave() {
    setSaving(true)
    const { data: existing } = await supabase
      .from('diet_settings')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle()
    await supabase.from('diet_settings').upsert(
      {
        ...(existing ?? {}),
        profile_id: profileId,
        morning_ingredients: morning,
        evening_ingredients: evening,
      },
      { onConflict: 'profile_id' }
    )
    setSaving(false)
    onSaved()
  }

  return (
    <StepShell
      title="Smoothie ingredients"
      subtitle="Seed the morning and evening smoothie ingredient lists. Caregivers can pick from these when logging a smoothie."
    >
      <div className="space-y-4">
        <div>
          <FieldLabel optional>Morning ingredients</FieldLabel>
          <TagInput
            tags={morning}
            onChange={setMorning}
            placeholder="Banana, spinach, almond butter…"
          />
        </div>
        <div>
          <FieldLabel optional>Evening ingredients</FieldLabel>
          <TagInput
            tags={evening}
            onChange={setEvening}
            placeholder="Blueberries, protein powder, oat milk…"
          />
        </div>
      </div>
      <StepFooterInline
        onNext={handleSave}
        onSkip={onSkip}
        saving={saving}
        nextLabel="Save & continue"
      />
    </StepShell>
  )
}

// ─── Step 6: Custom Trackers ─────────────────────────────────────────────────

const TYPE_LABELS: Record<TrackerType, string> = {
  duration: 'Duration',
  counter: 'Counter',
  yes_no: 'Yes / No',
  rating: 'Rating (1–5)',
}

const PALETTE = TRACKER_COLORS.slice(0, 8)

function TrackersStep({
  profileId,
  onSaved,
  onSkip,
}: {
  profileId: string
  onSaved: () => void
  onSkip: () => void
}) {
  const [trackers, setTrackers] = useState<NewTracker[]>([])
  const [draftName, setDraftName] = useState('')
  const [draftType, setDraftType] = useState<TrackerType>('counter')
  const [draftColor, setDraftColor] = useState(PALETTE[0])
  const [saving, setSaving] = useState(false)

  function addTracker() {
    if (!draftName.trim() || trackers.length >= 2) return
    setTrackers(prev => [...prev, { name: draftName.trim(), type: draftType, color: draftColor }])
    setDraftName('')
    setDraftType('counter')
    setDraftColor(PALETTE[0])
  }

  function removeTracker(i: number) {
    setTrackers(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (trackers.length === 0) { onSaved(); return }
    setSaving(true)
    for (const [i, t] of trackers.entries()) {
      await (supabase.from('custom_trackers') as unknown as {
        insert: (v: unknown) => Promise<unknown>
      }).insert({
        profile_id: profileId,
        name: t.name,
        icon_name: 'star',
        color: t.color,
        tracker_type: t.type,
        sort_order: i,
      })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <StepShell
      title="Custom trackers"
      subtitle="Create up to 2 trackers for anything you want to log that isn't covered by the built-in modules — screen time, outdoor play, meltdowns, whatever matters most."
    >
      {/* Added trackers list */}
      {trackers.length > 0 && (
        <div className="space-y-2">
          {trackers.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 bg-[var(--color-surface)] border border-black/10 rounded-xl"
            >
              <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ backgroundColor: t.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{t.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{TYPE_LABELS[t.type]}</p>
              </div>
              <button onClick={() => removeTracker(i)} className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add tracker form */}
      {trackers.length < 2 && (
        <div className="space-y-3 p-4 bg-[var(--color-surface)] border border-black/10 rounded-xl">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            {trackers.length === 0 ? 'Add a tracker' : 'Add one more'}
          </p>

          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput
              value={draftName}
              onChange={setDraftName}
              placeholder="e.g. Screen time, Outdoor play…"
            />
          </div>

          <div>
            <FieldLabel>Type</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {TRACKER_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDraftType(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    draftType === opt.id
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'border-black/10 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {draftType && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {TRACKER_TYPE_OPTIONS.find(o => o.id === draftType)?.description}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setDraftColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: draftColor === c ? '#fff' : c,
                    boxShadow: draftColor === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={addTracker}
            disabled={!draftName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add tracker
          </button>
        </div>
      )}

      <StepFooterInline
        onNext={handleSave}
        onSkip={onSkip}
        saving={saving}
        nextLabel={trackers.length > 0 ? 'Save & continue' : 'Continue'}
        skipLabel="Skip (optional)"
      />
    </StepShell>
  )
}

// ─── Step 7: Schedule Template ────────────────────────────────────────────────

function ScheduleStep({
  profileId,
  onSaved,
  onSkip,
}: {
  profileId: string
  onSaved: () => void
  onSkip: () => void
}) {
  const [items, setItems] = useState<NewScheduleItem[]>([])
  const [draftLabel, setDraftLabel] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [saving, setSaving] = useState(false)
  const labelRef = useRef<HTMLInputElement>(null)

  function addItem() {
    if (!draftLabel.trim() || items.length >= 8) return
    setItems(prev => [...prev, { label: draftLabel.trim(), time: draftTime }])
    setDraftLabel('')
    setDraftTime('')
    setTimeout(() => labelRef.current?.focus(), 50)
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (items.length === 0) { onSaved(); return }
    setSaving(true)
    for (const [i, item] of items.entries()) {
      await (supabase.from('schedule_template_items') as any).insert({
        profile_id: profileId,
        label: item.label,
        time_of_day: item.time || null,
        sort_order: i,
      })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <StepShell
      title="Daily schedule"
      subtitle="Build a basic schedule template — the daily routine caregivers can check off each day. You can refine it anytime in Schedule Settings."
    >
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 bg-[var(--color-surface)] border border-black/10 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">{item.label}</p>
                {item.time && (
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </p>
                )}
              </div>
              <button onClick={() => removeItem(i)} className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length < 8 && (
        <div className="space-y-3 p-4 bg-[var(--color-surface)] border border-black/10 rounded-xl">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Add an item
          </p>
          <div className="flex flex-col gap-2">
            <input
              ref={labelRef}
              type="text"
              value={draftLabel}
              onChange={e => setDraftLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="e.g. Morning routine, Lunch, Therapy…"
              className="w-full px-3.5 py-2.5 border border-black/10 rounded-xl bg-[var(--color-background)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={draftTime}
                onChange={e => setDraftTime(e.target.value)}
                className="flex-1 px-3.5 py-2.5 border border-black/10 rounded-xl bg-[var(--color-background)] text-[var(--color-text)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              />
              <button
                onClick={addItem}
                disabled={!draftLabel.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <StepFooterInline
        onNext={handleSave}
        onSkip={onSkip}
        saving={saving}
        nextLabel={items.length > 0 ? 'Save & finish' : 'Finish'}
        skipLabel="Skip (optional)"
      />
    </StepShell>
  )
}

// ─── Inline footer for steps 1–7 ─────────────────────────────────────────────

function StepFooterInline({
  onNext,
  onSkip,
  saving,
  nextLabel = 'Save & continue',
  skipLabel = 'Skip this step',
}: {
  onNext: () => void
  onSkip: () => void
  saving: boolean
  nextLabel?: string
  skipLabel?: string
}) {
  return (
    <div className="pt-2 space-y-2">
      <button
        onClick={onNext}
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all"
      >
        {saving ? 'Saving…' : nextLabel}
      </button>
      <button
        onClick={onSkip}
        className="w-full py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        {skipLabel}
      </button>
    </div>
  )
}

// ─── Completion card ──────────────────────────────────────────────────────────

function CompletionCard({ displayName, onDone }: { displayName: string; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-6">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center">
        <Check className="w-8 h-8 text-[var(--color-accent)]" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">You're all set!</h2>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-xs mx-auto">
          {displayName}'s diary is ready to go. Caregivers can start logging right away — and you
          can always come back to Settings to refine anything.
        </p>
      </div>
      <button
        onClick={onDone}
        className="w-full max-w-xs py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Go to dashboard
      </button>
    </div>
  )
}

// ─── Main SetupWizard component ───────────────────────────────────────────────

const TOTAL_CONTENT_STEPS = 7  // steps 1–7 (step 0 is intro)

export function SetupWizard({
  profileId,
  profileName,
  userId,
  initialStep = 0,
  onClose,
  onComplete,
}: SetupWizardProps) {
  const clampedInitial = Math.max(0, Math.min(initialStep, TOTAL_CONTENT_STEPS + 1))
  const { displayStep, isAnimating, navigate, getStyle } = useStepTransition(clampedInitial)
  const [displayName, setDisplayName] = useState(profileName)

  const isDone = displayStep > TOTAL_CONTENT_STEPS

  function advance(data?: { displayName?: string }) {
    if (data?.displayName) setDisplayName(data.displayName)
    const next = displayStep + 1
    // Steps 8+ show the completion card (still inside the wizard)
    navigate(next, 'forward')
  }

  function goBack() {
    navigate(Math.max(0, displayStep - 1), 'backward')
  }

  function handleClose() {
    onClose(displayStep)
  }

  const isIntro = displayStep === 0

  const content = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--color-background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 flex-shrink-0">
        <button
          onClick={displayStep > 0 && !isDone ? goBack : handleClose}
          disabled={isAnimating}
          className="p-2 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-0"
          aria-label={displayStep > 0 ? 'Go back' : 'Close'}
        >
          {displayStep > 0 && !isDone
            ? <ArrowLeft className="w-5 h-5 text-[var(--color-text-muted)]" />
            : <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          }
        </button>

        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          {isIntro || isDone ? '' : `Step ${displayStep} of ${TOTAL_CONTENT_STEPS}`}
        </span>

        <button
          onClick={handleClose}
          disabled={isAnimating}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-0"
        >
          {isDone ? '' : 'Save & exit'}
        </button>
      </div>

      {/* Progress bar */}
      {displayStep > 0 && !isDone && (
        <div className="h-1 bg-black/5 flex-shrink-0">
          <div
            className="h-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${(displayStep / TOTAL_CONTENT_STEPS) * 100}%` }}
          />
        </div>
      )}

      {/* Animated content */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-md mx-auto px-4 py-6"
          style={{
            ...getStyle(isIntro),
            pointerEvents: isAnimating ? 'none' : 'auto',
          }}
        >
          {isDone && (
            <CompletionCard displayName={displayName} onDone={onComplete} />
          )}
          {displayStep === 0 && (
            <IntroStep
              displayName={displayName || 'your family'}
              onGetStarted={() => navigate(1, 'forward')}
            />
          )}
          {displayStep === 1 && (
            <ChildInfoStep
              profileId={profileId}
              profileName={displayName}
              onSaved={(newName) => advance({ displayName: newName })}
              onSkip={advance}
            />
          )}
          {displayStep === 2 && (
            <CareNotesStep
              profileId={profileId}
              userId={userId}
              onSaved={advance}
              onSkip={advance}
            />
          )}
          {displayStep === 3 && (
            <FoodListStep
              profileId={profileId}
              onSaved={advance}
              onSkip={advance}
            />
          )}
          {displayStep === 4 && (
            <MedsStep
              profileId={profileId}
              onSaved={advance}
              onSkip={advance}
            />
          )}
          {displayStep === 5 && (
            <SmoothiesStep
              profileId={profileId}
              onSaved={advance}
              onSkip={advance}
            />
          )}
          {displayStep === 6 && (
            <TrackersStep
              profileId={profileId}
              onSaved={advance}
              onSkip={advance}
            />
          )}
          {displayStep === 7 && (
            <ScheduleStep
              profileId={profileId}
              onSaved={advance}
              onSkip={advance}
            />
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
