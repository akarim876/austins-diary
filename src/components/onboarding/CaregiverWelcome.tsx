import { createPortal } from 'react-dom'
import { useState } from 'react'
import { X, StickyNote, LayoutGrid, Check } from 'lucide-react'
import { useQuickTiles } from '../../hooks/useQuickTiles'
import { useTheme } from '../../hooks/useTheme'
import { TILE_DEFS } from '../../lib/tileConstants'
import { ModuleIcon } from '../ui/ModuleIcon'
import type { QuickTileId } from '../../hooks/useQuickTiles'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CaregiverWelcomeProps {
  profileId: string
  profileName: string
  userId: string
  onClose: () => void
}

// ─── Step shell ──────────────────────────────────────────────────────────────

function WelcomeStepShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Step 0: Welcome ─────────────────────────────────────────────────────────

function WelcomeStep({
  profileName,
  onContinue,
  onSkip,
}: {
  profileName: string
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <WelcomeStepShell
      icon={<span className="text-2xl font-bold text-[var(--color-accent)]">Hi!</span>}
      title={`Welcome to ${profileName}'s Diary`}
    >
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed text-center">
        You've been invited to help track {profileName}'s daily care — behaviors, meals, sleep,
        sensory regulation, and more — alongside the rest of the care team.
      </p>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed text-center">
        Everything you log is shared with the team instantly, so handoffs are smooth and nothing
        falls through the cracks. Let's take a quick look at how it works.
      </p>

      <div className="pt-2 space-y-2">
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Continue
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Skip
        </button>
      </div>
    </WelcomeStepShell>
  )
}

// ─── Step 1: Handoff note explanation ────────────────────────────────────────

function HandoffStep({
  profileName,
  onContinue,
  onSkip,
}: {
  profileName: string
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <WelcomeStepShell
      icon={<StickyNote className="w-7 h-7 text-[var(--color-accent)]" />}
      title="The Handoff Note"
    >
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed text-center">
        At the top of your dashboard, you'll always see a pinned Handoff Note. It's updated by
        whichever caregiver was with {profileName} most recently.
      </p>

      {/* Visual mockup */}
      <div className="bg-[var(--color-surface)] border border-black/10 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Handoff note
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">just now</span>
        </div>
        <p className="text-sm text-[var(--color-text)] leading-relaxed italic">
          "Good morning! {profileName} had a rough night — woke twice around 2am. He's a bit tired
          today so keep transitions gentle. Lunch is in the fridge."
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">Last updated by Maria</p>
      </div>

      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed text-center">
        Check it first when you start your shift, and update it when you're done — so the next
        person is always in the loop.
      </p>

      <div className="pt-2 space-y-2">
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Got it, continue
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Skip
        </button>
      </div>
    </WelcomeStepShell>
  )
}

// ─── Step 2: Personalize (tiles + theme) ─────────────────────────────────────

function PersonalizeStep({
  userId,
  onDone,
  onSkip,
}: {
  userId: string
  onDone: () => void
  onSkip: () => void
}) {
  const { tiles, setTiles } = useQuickTiles(userId)
  const { theme, setTheme, themes } = useTheme()

  function toggleTile(id: QuickTileId) {
    if (tiles.includes(id)) {
      if (tiles.length <= 2) return  // must keep at least 2
      setTiles(tiles.filter(t => t !== id))
    } else {
      if (tiles.length >= 6) return  // max 6
      setTiles([...tiles, id])
    }
  }

  return (
    <WelcomeStepShell
      icon={<LayoutGrid className="w-7 h-7 text-[var(--color-accent)]" />}
      title="Make it yours"
    >
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed text-center">
        Choose the quick-add tiles that match how you help care for {' '}
        the child, and pick a color theme you like. These preferences are personal to you — you
        can always change them in Settings.
      </p>

      {/* Quick-add tiles */}
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Quick-add tiles</p>
        <div className="grid grid-cols-2 gap-2">
          {TILE_DEFS.map(tile => {
            const selected = tiles.includes(tile.id as QuickTileId)
            return (
              <button
                key={tile.id}
                onClick={() => toggleTile(tile.id as QuickTileId)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  selected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/8'
                    : 'border-black/10 bg-[var(--color-surface)]'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: tile.iconBg }}
                >
                  <ModuleIcon name={tile.icon} className="w-3.5 h-3.5" style={{ color: tile.accent }} />
                </div>
                <span className={`text-sm font-medium truncate ${selected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
                  {tile.label}
                </span>
                {selected && <Check className="w-3.5 h-3.5 text-[var(--color-accent)] ml-auto flex-shrink-0" />}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          {tiles.length} selected (2–6 recommended)
        </p>
      </div>

      {/* Theme picker */}
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Color theme</p>
        <div className="grid grid-cols-2 gap-2">
          {themes.map(t => {
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/8'
                    : 'border-black/10 bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex gap-0.5 flex-shrink-0">
                  <div className="w-4 h-4 rounded-sm" style={{ background: t.bg }} />
                  <div className="w-4 h-4 rounded-sm" style={{ background: t.accent }} />
                  <div className="w-4 h-4 rounded-sm" style={{ background: t.secondary }} />
                </div>
                <span className={`text-sm font-medium ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
                  {t.label}
                </span>
                {active && <Check className="w-3.5 h-3.5 text-[var(--color-accent)] ml-auto flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <button
          onClick={onDone}
          className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Get started
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Skip for now
        </button>
      </div>
    </WelcomeStepShell>
  )
}

// ─── Main CaregiverWelcome component ─────────────────────────────────────────

const TOTAL_STEPS = 3  // steps 0, 1, 2

export function CaregiverWelcome({
  profileId: _profileId,
  profileName,
  userId,
  onClose,
}: CaregiverWelcomeProps) {
  const [step, setStep] = useState(0)

  function advance() { setStep(s => Math.min(s + 1, TOTAL_STEPS - 1 + 1)) }
  function goBack() { setStep(s => Math.max(0, s - 1)) }

  const isDone = step >= TOTAL_STEPS

  if (isDone) {
    onClose()
    return null
  }

  const content = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--color-background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 flex-shrink-0">
        <button
          onClick={step > 0 ? goBack : onClose}
          className="p-2 rounded-lg hover:bg-black/5 transition-colors"
        >
          <X className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? 'var(--color-accent)' : 'rgba(0,0,0,0.15)',
              }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          {step === 0 && (
            <WelcomeStep
              profileName={profileName}
              onContinue={advance}
              onSkip={onClose}
            />
          )}
          {step === 1 && (
            <HandoffStep
              profileName={profileName}
              onContinue={advance}
              onSkip={onClose}
            />
          )}
          {step === 2 && (
            <PersonalizeStep
              userId={userId}
              onDone={onClose}
              onSkip={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
