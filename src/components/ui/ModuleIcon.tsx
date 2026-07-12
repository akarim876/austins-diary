/**
 * Custom SVG icons for the app's six core data modules.
 * All icons share the same geometry contract:
 *   viewBox 0 0 24 24 · stroke-width 1.6 · stroke-linecap round
 *   stroke-linejoin round · fill none · stroke currentColor
 *
 * Color is controlled entirely via CSS (className or style.color).
 * Keep generic UI chrome (settings gear, search, delete, etc.) in
 * lucide-react. Only use ModuleIcon for module-level identification.
 */

import type { CSSProperties } from 'react'

export type ModuleIconName =
  | 'smoothie'
  | 'meal'
  | 'behavior'
  | 'sensory'
  | 'sleep'
  | 'goals'
  | 'appointments'

// ---------------------------------------------------------------------------
// Path definitions — each icon is a fragment of SVG elements
// ---------------------------------------------------------------------------

function Smoothie() {
  return (
    <>
      <path d="M8 3h8l-1.2 5H9.2L8 3z" />
      <path d="M9.2 8l1.1 11h3.4l1.1-11" />
      <path d="M13 3l3-2" />
    </>
  )
}

function Meal() {
  return (
    <>
      {/* fork: two outer tines joined by a rounded arch at the base */}
      <path d="M6 2v5a2 2 0 0 0 4 0V2" />
      {/* fork: centre tine */}
      <path d="M8 2v5" />
      {/* fork: handle — starts at the arch */}
      <path d="M8 7v14" />
      {/* knife: blade widens slightly at the spine, tapers at the tip */}
      <path d="M15 2c1.5 0 3.5 1.5 3.5 5v14" />
    </>
  )
}

function Behavior() {
  return (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
    </>
  )
}

function Sensory() {
  return (
    <>
      <path d="M2 12c2-4 4 4 6 0s4 4 6 0s4 4 6 0" />
    </>
  )
}

function Sleep() {
  return (
    <>
      <path d="M17 12.5A7 7 0 0110.5 4a7.5 7.5 0 108.4 10.4c-.6.1-1.2.1-1.9.1z" />
    </>
  )
}

function Goals() {
  return (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  )
}

function Appointments() {
  return (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3v4M16 3v4M4 10h16" />
      <circle cx="12.5" cy="14.5" r="2.7" />
      <path d="M12.5 13.3v1.4l1 .7" />
    </>
  )
}

// ---------------------------------------------------------------------------
// Map of name → inner component
// ---------------------------------------------------------------------------

const ICONS: Record<ModuleIconName, () => JSX.Element> = {
  smoothie:     Smoothie,
  meal:         Meal,
  behavior:     Behavior,
  sensory:      Sensory,
  sleep:        Sleep,
  goals:        Goals,
  appointments: Appointments,
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface ModuleIconProps {
  name: ModuleIconName
  className?: string
  style?: CSSProperties
}

export function ModuleIcon({ name, className, style }: ModuleIconProps) {
  const Inner = ICONS[name]
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <Inner />
    </svg>
  )
}
