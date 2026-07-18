/**
 * RegulationFaceIcon — one custom face SVG per regulation zone.
 *
 * Follows the same geometry contract as ModuleIcon:
 *   viewBox 0 0 24 24 · stroke currentColor · strokeWidth 1.6
 *   strokeLinecap round · strokeLinejoin round · fill none
 *
 * Color is driven entirely by CSS (pass className or style.color).
 * Designed to be recognisable at 24 – 40 px.
 */

import type { CSSProperties } from 'react'
import type { RegulationLevel } from '../../types'

// ─── Per-zone face fragments ──────────────────────────────────────────────────

/** Calm 😌 — squinting happy eyes, broad warm smile */
function FaceCalm() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      {/* happy-squint eyes: arc curves upward — peaceful joy */}
      <path d="M8.5 11.5q1.5-1.8 3 0" />
      <path d="M12.5 11.5q1.5-1.8 3 0" />
      {/* broad smile: control points above endpoints */}
      <path d="M8 15c1-2 7-2 8 0" />
    </>
  )
}

/** Alert 🔆 — raised brows, open eyes, slight smile */
function FaceAlert() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      {/* raised brows: gentle upward arcs */}
      <path d="M7.5 8.5q1.5-.8 3 0" />
      <path d="M13.5 8.5q1.5-.8 3 0" />
      {/* wide-open eyes */}
      <circle cx="9.5" cy="11.2" r="1.3" />
      <circle cx="14.5" cy="11.2" r="1.3" />
      {/* slight upturn: control points just above endpoints */}
      <path d="M9.5 15.5c.5-1.2 5-1.2 5.5 0" />
    </>
  )
}

/** Anxious 😟 — furrowed brows angled inward, wider eyes, slight frown */
function FaceAnxious() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      {/* furrowed brows: slope downward toward nose */}
      <path d="M7.5 8.5l2.5 1.5" />
      <path d="M16.5 8.5l-2.5 1.5" />
      {/* wider, tense eyes */}
      <circle cx="9.5" cy="11.5" r="1.5" />
      <circle cx="14.5" cy="11.5" r="1.5" />
      {/* frown: control points below endpoints */}
      <path d="M9.5 15.5c1 1.5 5 1.5 6 0" />
    </>
  )
}

/** Dysregulated 😡 — sharp angry brows, very wide eyes, deep frown */
function FaceDysregulated() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      {/* sharp angry brows: steep inward angle */}
      <path d="M7.5 8l3 2" />
      <path d="M16.5 8l-3 2" />
      {/* large, strained eyes */}
      <circle cx="9.5" cy="11.5" r="1.8" />
      <circle cx="14.5" cy="11.5" r="1.8" />
      {/* deep grimace: control points well below endpoints */}
      <path d="M9 15.5c1 2.2 6 2.2 7 0" />
    </>
  )
}

/** Shutdown 😶 — heavy drooping brows, closed eyes, flat mouth */
function FaceShutdown() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      {/* heavy brows: droop downward toward nose */}
      <path d="M7.5 9.5l3 1" />
      <path d="M16.5 9.5l-3 1" />
      {/* closed eyes: arcs curving downward (drooping lids) */}
      <path d="M8.5 11.5q1.5 1.5 3 0" />
      <path d="M12.5 11.5q1.5 1.5 3 0" />
      {/* flat, expressionless mouth */}
      <path d="M9.5 15.5h5" />
    </>
  )
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const FACES: Record<RegulationLevel, () => React.ReactElement> = {
  calm:         FaceCalm,
  alert:        FaceAlert,
  anxious:      FaceAnxious,
  dysregulated: FaceDysregulated,
  shutdown:     FaceShutdown,
}

// ─── Public component ─────────────────────────────────────────────────────────

interface RegulationFaceIconProps {
  zone:       RegulationLevel
  size?:      number
  className?: string
  style?:     CSSProperties
}

export function RegulationFaceIcon({
  zone,
  size      = 24,
  className,
  style,
}: RegulationFaceIconProps) {
  const Inner = FACES[zone]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
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
