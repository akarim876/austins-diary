/**
 * Public landing page — 5-slide onboarding for unauthenticated visitors.
 * Authenticated users never reach this; App.tsx routes them straight to AppShell.
 */
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'

const TOTAL_SLIDES = 5
const FEATURE_SLIDE_COUNT = 4
const ANIM_MS = 280

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

function DotIndicators({ activeIndex, reduced }: { activeIndex: number; reduced: boolean }) {
  return (
    <div
      className="flex items-center justify-center gap-2 mb-5"
      style={enterStyle(reduced, 320)}
      aria-hidden="true"
    >
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
}: {
  src: string
  reduced: boolean
  delay: number
  className?: string
  style?: CSSProperties
  rotate?: number
}) {
  return (
    <div className={className} style={{ ...style, ...enterStyle(reduced, delay, 'scale') }}>
      <img
        src={src}
        alt=""
        className="w-full h-full object-contain"
        style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
      />
    </div>
  )
}

function BehaviorArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-xs mx-auto h-56 sm:h-64">
      <ArtPiece
        src="/Images/Smiley-face-1.png"
        reduced={reduced}
        delay={140}
        rotate={6}
        className="absolute"
        style={{ width: '52%', top: '2%', right: '4%' }}
      />
      <ArtPiece
        src="/Images/Smiley-face-2.png"
        reduced={reduced}
        delay={220}
        rotate={-8}
        className="absolute"
        style={{ width: '40%', bottom: '6%', left: '6%' }}
      />
      <ArtPiece
        src="/Images/Smiley-face-3.png"
        reduced={reduced}
        delay={300}
        rotate={4}
        className="absolute"
        style={{ width: '42%', bottom: '4%', right: '10%' }}
      />
    </div>
  )
}

function DietArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-sm mx-auto h-56 sm:h-64 flex items-center justify-center">
      <Baseline />
      <div
        className="absolute rounded-full"
        style={{
          width: '58%',
          aspectRatio: '1',
          background: 'var(--color-accent)',
          opacity: 0.85,
          ...enterStyle(reduced, 120, 'scale'),
        }}
      />
      <ArtPiece
        src="/Images/Food-art.png"
        reduced={reduced}
        delay={200}
        className="relative z-10"
        style={{ width: '72%', maxHeight: '90%' }}
      />
    </div>
  )
}

function HandoffArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-sm mx-auto h-56 sm:h-64">
      <Baseline />
      <ArtPiece
        src="/Images/Smiley-face-4.png"
        reduced={reduced}
        delay={140}
        rotate={-6}
        className="absolute z-10"
        style={{ width: '28%', bottom: '16%', left: '4%' }}
      />
      <ArtPiece
        src="/Images/Notes.png"
        reduced={reduced}
        delay={220}
        rotate={8}
        className="absolute z-20"
        style={{ width: '34%', bottom: '14%', left: '33%' }}
      />
      <ArtPiece
        src="/Images/Smiley-face-5.png"
        reduced={reduced}
        delay={300}
        rotate={4}
        className="absolute z-10"
        style={{ width: '36%', bottom: '14%', right: '2%' }}
      />
    </div>
  )
}

function ProgressArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-sm mx-auto h-56 sm:h-64">
      <ArtPiece
        src="/Images/Smiley-face-6.png"
        reduced={reduced}
        delay={140}
        rotate={-4}
        className="absolute"
        style={{ width: '42%', top: '8%', left: '2%' }}
      />
      <ArtPiece
        src="/Images/Smiley-face-7.png"
        reduced={reduced}
        delay={220}
        className="absolute z-10"
        style={{ width: '26%', top: '28%', left: '38%' }}
      />
      <ArtPiece
        src="/Images/Smiley-doc-face.png"
        reduced={reduced}
        delay={300}
        rotate={3}
        className="absolute"
        style={{ width: '48%', top: '4%', right: '0%' }}
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
  const [busy, setBusy]   = useState(false)

  function goTo(next: number) {
    if (busy || next === slide) return
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
      goTo(slide + 1)
    } else {
      navigate('/auth?mode=signup')
    }
  }

  const shellAnim: CSSProperties = reduced
    ? {}
    : phase === 'out'
      ? { animation: `slideExitLeft ${ANIM_MS}ms ease-out both` }
      : { animation: `slideEnterRight ${ANIM_MS}ms ease-out both` }

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

      {/* ── Slide body ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-5 pb-8 max-w-lg mx-auto w-full">
        <div key={slide} className="flex-1 flex flex-col" style={shellAnim}>

          {isHero ? (
            /* ── Slide 0: Hero ─────────────────────────────────────────────── */
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
                className="text-base sm:text-lg leading-relaxed max-w-xl mb-10"
                style={{
                  color: 'var(--color-text-muted)',
                  fontFamily: '"Merriweather", Georgia, serif',
                  ...enterStyle(reduced, 180),
                }}
              >
                A private space for the people who care for them most — built to hold the small wins,
                understand the hard moments, and keep everyone who loves your child in sync.
              </p>

              <div className="mt-auto w-full pt-6" style={enterStyle(reduced, 260)}>
                <ContinueButton onClick={handleContinue} reduced={reduced} />
              </div>
            </div>
          ) : (
            /* ── Slides 1–4: Feature slides ────────────────────────────────── */
            (() => {
              const feature = FEATURE_SLIDES[featureIndex]
              const Art = FEATURE_ART[featureIndex]
              return (
                <div className="flex-1 flex flex-col items-center text-center pt-6">
                  <h2
                    className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight px-2"
                    style={{
                      color: 'var(--color-accent)',
                      fontFamily: '"Fraunces", Georgia, serif',
                      ...enterStyle(reduced, 40),
                    }}
                  >
                    {feature.title}
                  </h2>

                  <p
                    className="text-sm sm:text-base leading-relaxed mt-4 mb-6 max-w-md px-1"
                    style={{
                      color: 'var(--color-text)',
                      fontFamily: '"Merriweather", Georgia, serif',
                      ...enterStyle(reduced, 100),
                    }}
                  >
                    {feature.desc}
                  </p>

                  <div className="w-full flex-1 flex items-center justify-center min-h-[220px]">
                    <Art reduced={reduced} />
                  </div>

                  <div className="mt-auto w-full pt-4">
                    <DotIndicators activeIndex={featureIndex} reduced={reduced} />
                    <ContinueButton onClick={handleContinue} reduced={reduced} style={enterStyle(reduced, 360)} />
                  </div>
                </div>
              )
            })()
          )}
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
        @keyframes slideExitLeft {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-28px); }
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
