/**
 * Public landing page — shown at "/" for unauthenticated visitors.
 * Authenticated users never reach this; App.tsx routes them straight to AppShell.
 * No API calls, no auth — purely static content.
 */
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLogo } from '../components/ui/AppLogo'
import { ModuleIcon } from '../components/ui/ModuleIcon'

// ─── Content data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon:      'behavior' as const,
    iconColor: '#92400E',
    iconBg:    '#FEF3C7',
    title:     'Behavior & sensory tracking',
    desc:      'Log incidents, regulation zones, and what helped — with time, location, and context captured in seconds.',
  },
  {
    icon:      'meal' as const,
    iconColor: '#065F46',
    iconBg:    '#D1FAE5',
    title:     'Diet & daily routines',
    desc:      'Track meals, smoothies, supplements, and a daily schedule your whole care team can follow and update.',
  },
  {
    icon:      'sensory' as const,
    iconColor: '#5B21B6',
    iconBg:    '#EDE9FE',
    title:     'Handoff notes for caregivers',
    desc:      'A shared, always-current note at the top of the dashboard so anyone stepping in knows exactly what\'s going on.',
  },
  {
    icon:      'goals' as const,
    iconColor: '#0F766E',
    iconBg:    '#CCFBF1',
    title:     'Progress you can bring to appointments',
    desc:      'Export a clean PDF report — organized by module — ready for doctors, therapists, and school meetings.',
  },
] as const

const STEPS = [
  {
    num:   '1',
    title: 'Set up your child\'s profile',
    desc:  'Add their name, allergies, and key medical notes. A guided setup wizard walks you through the whole thing.',
  },
  {
    num:   '2',
    title: 'Log moments as they happen',
    desc:  'Tap to log a behavior, sleep session, or meal in under 30 seconds — or use voice-to-text from anywhere in the app.',
  },
  {
    num:   '3',
    title: 'Share with caregivers and providers',
    desc:  'Invite other caregivers with one link. Export a full report before any appointment — no prep work needed.',
  },
] as const

// ─── Animation helpers ────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CTAButton({
  onClick,
  reduced,
  children,
}: {
  onClick: () => void
  reduced: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-white text-sm font-bold shadow-md"
      style={{
        background: 'var(--color-accent)',
        transition: reduced ? 'none' : 'transform 150ms ease-out',
      }}
      onMouseEnter={e => { if (!reduced) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
      onFocus={e     => { if (!reduced) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
      onBlur={e      => { (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      {children}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate    = useNavigate()
  const reduced     = usePrefersReducedMotion()
  const sectionRef  = useRef<HTMLDivElement>(null)

  // Scroll-reveal with IntersectionObserver
  useEffect(() => {
    if (reduced) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.style.opacity   = '1'
            el.style.transform = 'translateY(0)'
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' },
    )

    sectionRef.current
      ?.querySelectorAll<HTMLElement>('.reveal')
      .forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [reduced])

  /** Stagger delay style applied to each reveal element */
  function stagger(i: number, baseMs = 80): CSSProperties {
    if (reduced) return {}
    return {
      opacity:    0,
      transform:  'translateY(20px)',
      transition: `opacity 250ms ease-out ${i * baseMs}ms, transform 250ms ease-out ${i * baseMs}ms`,
    }
  }

  return (
    <div
      ref={sectionRef}
      className="min-h-dvh"
      style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}
    >
      {/* ── Minimal nav ───────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <AppLogo className="h-7" />
          <span
            className="text-sm font-bold tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Austin's Diary
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

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="flex flex-col items-center text-center px-5 pt-10 pb-20 max-w-3xl mx-auto"
        style={reduced ? {} : { animation: 'heroFadeUp 280ms ease-out both' }}
      >
        <img src="/Icon-splash.png" alt="Austin's Diary" className="h-24 w-24 object-contain mb-7" />

        <h1
          className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-5"
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            color:      'var(--color-text)',
          }}
        >
          Every detail<br />
          matters.{' '}
          <br className="hidden sm:block" />
          <span className="text-3xl sm:text-4xl" style={{ color: 'var(--color-accent)' }}>
            Here's where you<br />
            keep them.
          </span>
        </h1>

        <p
          className="text-base sm:text-lg leading-relaxed max-w-xl mb-8"
          style={{ color: 'var(--color-text-muted)', fontFamily: '"Merriweather", Georgia, serif', fontWeight: 300 }}
        >
          A private space for the people who care for them most — built to hold the small wins,
          understand the hard moments, and keep everyone who loves your child in sync.
        </p>

        <CTAButton onClick={() => navigate('/auth?mode=signup')} reduced={reduced}>
          Start for free
        </CTAButton>

        <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
          No credit card required &mdash; everything stays private and secure.
        </p>
      </section>

      {/* ── Feature highlights ────────────────────────────────────────────── */}
      <section className="px-5 pb-20 max-w-4xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl font-bold text-center mb-10 reveal"
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            color:      'var(--color-text)',
            ...stagger(0),
          }}
        >
          One place for everything that matters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="reveal flex gap-4 rounded-xl p-5 shadow-sm"
              style={{
                background: 'var(--color-surface)',
                ...stagger(i + 1),
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: f.iconBg }}
              >
                <ModuleIcon
                  name={f.icon}
                  className="w-5 h-5"
                  style={{ color: f.iconColor }}
                />
              </div>
              <div>
                <p
                  className="text-sm font-bold mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  {f.title}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--color-surface)' }}>
        <div className="px-5 py-16 max-w-2xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-10 reveal"
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              color:      'var(--color-text)',
              ...stagger(0),
            }}
          >
            Simple to get started
          </h2>

          <div className="space-y-7">
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className="reveal flex items-start gap-5"
                style={stagger(i + 1, 100)}
              >
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {s.num}
                </div>
                <div className="pt-0.5">
                  <p
                    className="text-sm font-bold mb-1"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {s.title}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ───────────────────────────────────────────────────── */}
      <section className="px-5 pt-16 pb-24 text-center max-w-lg mx-auto">
        <h2
          className="text-2xl sm:text-3xl font-bold mb-3 reveal"
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            color:      'var(--color-text)',
            ...stagger(0),
          }}
        >
          Start keeping track today
        </h2>
        <p
          className="text-sm leading-relaxed mb-8 reveal"
          style={{ color: 'var(--color-text-muted)', ...stagger(1) }}
        >
          Everything here stays private, just for the people who love them.
        </p>

        <div className="reveal flex flex-col items-center gap-4" style={stagger(2)}>
          <CTAButton onClick={() => navigate('/auth?mode=signup')} reduced={reduced}>
            Start for free
          </CTAButton>

          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-accent)' }}
            >
              Log in
            </button>
          </p>
        </div>
      </section>

      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
