/**
 * Public landing page — 5-slide onboarding for unauthenticated visitors.
 * Authenticated users never reach this; App.tsx routes them straight to AppShell.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'

const TOTAL_SLIDES = 5
const FEATURE_SLIDE_COUNT = 4
const ANIM_MS = 280
const SWIPE_THRESHOLD_PX = 48

// ─── Feature slide content ────────────────────────────────────────────────────

const FEATURE_SLIDES = [
  {
    title: 'Behavior & Sensory Tracking',
    desc:  'Log incidents, regulation zones, and what helped — with time, location, and context captured in seconds.',
  },
  {
    title: 'Diet and Daily Routines',
    desc:  'Track meals, snacks, supplements, and a daily schedule your whole care team can follow and update.',
  },
  {
    title: 'Handoff notes for caregivers',
    desc:  "A shared, always-current note at the top of the dashboard so anyone stepping in knows exactly what's going on.",
  },
  {
    title: 'Progress you can bring to appointments',
    desc:  'Export a clean PDF report, organized by module, ready for doctors, therapists, and school meetings.',
  },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function enterStyle(reduced: boolean, delayMs: number, kind: 'up' | 'scale' = 'up'): CSSProperties {
  if (reduced) return {}
  const from = kind === 'scale'
    ? 'scale(0.85)'
    : 'translateY(18px)'
  return {
    opacity: 0,
    transform: from,
    animation: `slideEnter${kind === 'scale' ? 'Scale' : 'Up'} ${ANIM_MS}ms ease-out ${delayMs}ms both`,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContinueButton({
  onClick,
  reduced,
  style,
}: {
  onClick: () => void
  reduced: boolean
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full max-w-sm mx-auto block py-3.5 rounded-lg text-white text-sm font-bold tracking-wide uppercase shadow-md"
      style={{
        background: 'var(--color-accent)',
        transition: reduced ? 'none' : 'transform 150ms ease-out',
        ...style,
      }}
      onMouseEnter={e => { if (!reduced) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      Continue
    </button>
  )
}

function DotIndicators({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5" aria-hidden="true">
      {Array.from({ length: FEATURE_SLIDE_COUNT }).map((_, i) => (
        <span
          key={i}
          className="transition-all duration-200"
          style={{
            height: 6,
            width: i === activeIndex ? 22 : 6,
            borderRadius: 999,
            background: i === activeIndex ? 'var(--color-accent)' : 'rgba(51,50,46,0.22)',
          }}
        />
      ))}
    </div>
  )
}

/** Horizontal baseline used under illustration clusters */
function Baseline() {
  return (
    <div
      className="absolute left-0 right-0"
      style={{
        bottom: '18%',
        height: 1.5,
        background: 'var(--color-text)',
        opacity: 0.55,
      }}
    />
  )
}

// ─── Illustration clusters ────────────────────────────────────────────────────

function ArtPiece({
  src,
  reduced,
  delay,
  className,
  style,
  rotate = 0,
  imgStyle,
}: {
  src: string
  reduced: boolean
  delay: number
  className?: string
  style?: CSSProperties
  rotate?: number
  imgStyle?: CSSProperties
}) {
  return (
    <div className={className} style={{ ...style, ...enterStyle(reduced, delay, 'scale') }}>
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain"
        style={{
          transform: rotate ? `rotate(${rotate}deg)` : undefined,
          ...imgStyle,
        }}
      />
    </div>
  )
}

function BehaviorArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-xs mx-auto h-56 sm:h-64">
      {/* Yellow face — larger, back, higher up */}
      <ArtPiece
        src="/Images/Smiley-face-3.png"
        reduced={reduced}
        delay={140}
        rotate={4}
        className="absolute z-0"
        style={{ width: '56%', top: '0%', right: '6%' }}
      />
      {/* Blue face — mid */}
      <ArtPiece
        src="/Images/Smiley-face-2.png"
        reduced={reduced}
        delay={220}
        rotate={-8}
        className="absolute z-10"
        style={{ width: '40%', bottom: '6%', left: '6%' }}
      />
      {/* Teal face — smaller, front, lower center */}
      <ArtPiece
        src="/Images/Smiley-face-1.png"
        reduced={reduced}
        delay={300}
        rotate={6}
        className="absolute z-20"
        style={{ width: '36%', bottom: '2%', left: '32%' }}
      />
    </div>
  )
}

function DietArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-sm mx-auto h-56 sm:h-64 flex items-center justify-center">
      <Baseline />
      <ArtPiece
        src="/Images/Food-art.png"
        reduced={reduced}
        delay={160}
        className="relative z-10"
        style={{ width: '72%', maxHeight: '90%' }}
      />
    </div>
  )
}

function HandoffArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-sm mx-auto h-56 sm:h-64">
      <ArtPiece
        src="/Images/Smiley-face-4.png"
        reduced={reduced}
        delay={140}
        rotate={-6}
        className="absolute z-20"
        style={{ width: '26%', bottom: '16%', left: '2%' }}
      />
      <ArtPiece
        src="/Images/Notes.png"
        reduced={reduced}
        delay={220}
        rotate={8}
        className="absolute z-0"
        style={{ width: '96%', bottom: '4%', left: '2%' }}
      />
      <ArtPiece
        src="/Images/Smiley-face-5.png"
        reduced={reduced}
        delay={300}
        rotate={4}
        className="absolute z-20"
        style={{ width: '44%', bottom: '12%', right: '0%' }}
      />
    </div>
  )
}

function ProgressArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-sm mx-auto h-56 sm:h-64">
      {/* Face 7 — larger, left (where face 6 was) */}
      <ArtPiece
        src="/Images/Smiley-face-7.png"
        reduced={reduced}
        delay={140}
        rotate={-4}
        className="absolute"
        style={{ width: '42%', top: '8%', left: '2%' }}
      />
      {/* Face 6 — smaller, lower center */}
      <ArtPiece
        src="/Images/Smiley-face-6.png"
        reduced={reduced}
        delay={220}
        className="absolute z-10"
        style={{ width: '26%', bottom: '4%', left: '36%' }}
      />
      {/* Doc face — bigger, right */}
      <ArtPiece
        src="/Images/Smiley-doc-face.png"
        reduced={reduced}
        delay={300}
        rotate={3}
        className="absolute z-20"
        style={{ width: '72%', top: '-2%', right: '-4%' }}
      />
    </div>
  )
}

const FEATURE_ART = [BehaviorArt, DietArt, HandoffArt, ProgressArt] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate()
  const reduced  = usePrefersReducedMotion()
  const [slide, setSlide] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const [dir, setDir]     = useState<'forward' | 'back'>('forward')
  const [busy, setBusy]   = useState(false)

  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const swiping      = useRef(false)

  function goTo(next: number, direction: 'forward' | 'back' = 'forward') {
    if (busy || next === slide || next < 0 || next >= TOTAL_SLIDES) return
    setDir(direction)
    if (reduced) {
      setSlide(next)
      return
    }
    setBusy(true)
    setPhase('out')
    window.setTimeout(() => {
      setSlide(next)
      setPhase('in')
      window.setTimeout(() => setBusy(false), ANIM_MS)
    }, ANIM_MS)
  }

  function handleContinue() {
    if (slide < TOTAL_SLIDES - 1) {
      goTo(slide + 1, 'forward')
    } else {
      navigate('/auth?mode=signup')
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    // Ignore swipes that start on interactive controls
    const tag = (e.target as HTMLElement).closest('button, a, input, textarea')
    if (tag) return
    pointerStart.current = { x: e.clientX, y: e.clientY }
    swiping.current = false
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointerStart.current || busy) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      swiping.current = true
      e.preventDefault()
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!pointerStart.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    pointerStart.current = null

    if (!swiping.current || Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) {
      swiping.current = false
      return
    }
    swiping.current = false

    if (dx < 0) {
      // Swipe left → next
      if (slide < TOTAL_SLIDES - 1) goTo(slide + 1, 'forward')
      else navigate('/auth?mode=signup')
    } else {
      // Swipe right → previous
      if (slide > 0) goTo(slide - 1, 'back')
    }
  }

  const shellAnim: CSSProperties = reduced
    ? {}
    : phase === 'out'
      ? {
          animation: dir === 'forward'
            ? `slideExitLeft ${ANIM_MS}ms ease-out both`
            : `slideExitRight ${ANIM_MS}ms ease-out both`,
        }
      : {
          animation: dir === 'forward'
            ? `slideEnterRight ${ANIM_MS}ms ease-out both`
            : `slideEnterLeft ${ANIM_MS}ms ease-out both`,
        }

  const isHero = slide === 0
  const featureIndex = slide - 1

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <AppLogo className="h-7" />
          <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Austin&apos;s Diary
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-accent)' }}
        >
          Log in
        </button>
      </nav>

      {/* ── Slide body (swipeable) ─────────────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col px-5 pb-8 max-w-lg mx-auto w-full"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { pointerStart.current = null }}
      >
        {/* Animated content only — Continue stays pinned below */}
        <div key={slide} className="flex-1 flex flex-col min-h-0" style={shellAnim}>
          {isHero ? (
            <div className="flex-1 flex flex-col items-center text-center pt-10">
              <img
                src="/Icon-splash.png"
                alt="Austin's Diary"
                className="h-24 w-24 object-contain mb-7"
                style={enterStyle(reduced, 0, 'scale')}
              />

              <h1
                className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight"
                style={{
                  color: 'var(--color-text)',
                  fontFamily: '"Fraunces", Georgia, serif',
                  ...enterStyle(reduced, 60),
                }}
              >
                Every detail<br />
                matters.
              </h1>

              <p
                className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mt-4 mb-5"
                style={{
                  color: 'var(--color-accent)',
                  fontFamily: '"Fraunces", Georgia, serif',
                  ...enterStyle(reduced, 120),
                }}
              >
                Here&apos;s where you<br />
                keep them.
              </p>

              <p
                className="text-lg sm:text-xl leading-relaxed max-w-xl"
                style={{
                  color: 'var(--color-text-muted)',
                  fontFamily: '"Merriweather", Georgia, serif',
                  ...enterStyle(reduced, 180),
                }}
              >
                A private space for the people who care for them most — built to hold the small wins,
                understand the hard moments, and keep everyone who loves your child in sync.
              </p>
            </div>
          ) : (
            (() => {
              const feature = FEATURE_SLIDES[featureIndex]
              const Art = FEATURE_ART[featureIndex]
              return (
                <div className="flex-1 flex flex-col items-center text-center pt-6 min-h-0">
                  <h2
                    className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight px-2"
                    style={{
                      color: 'var(--color-accent)',
                      fontFamily: '"Fraunces", Georgia, serif',
                      ...enterStyle(reduced, 40),
                    }}
                  >
                    {feature.title}
                  </h2>

                  <p
                    className="text-base sm:text-lg leading-relaxed mt-4 mb-6 max-w-md px-1"
                    style={{
                      color: 'var(--color-text)',
                      fontFamily: '"Merriweather", Georgia, serif',
                      ...enterStyle(reduced, 100),
                    }}
                  >
                    {feature.desc}
                  </p>

                  <div className="w-full flex-1 flex items-center justify-center min-h-[180px]">
                    <Art reduced={reduced} />
                  </div>
                </div>
              )
            })()
          )}
        </div>

        {/* Fixed footer — does not remount or animate with slide changes */}
        <div className="w-full pt-4 flex-shrink-0">
          {!isHero && <DotIndicators activeIndex={featureIndex} />}
          {/* Reserve dot space on hero so Continue stays at the same Y */}
          {isHero && <div className="mb-5" style={{ height: 6 }} aria-hidden="true" />}
          <ContinueButton onClick={handleContinue} reduced={reduced} />
        </div>
      </main>

      {/* ── Keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes slideEnterUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideEnterScale {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideEnterRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideEnterLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideExitLeft {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-28px); }
        }
        @keyframes slideExitRight {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(28px); }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
