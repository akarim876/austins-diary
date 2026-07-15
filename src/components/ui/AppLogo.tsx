/**
 * Austin's Diary logo as an inline React SVG component.
 *
 * The main shape uses fill="var(--color-accent)" so it automatically
 * follows the active theme without any additional code.
 * The highlight detail uses semi-transparent white so it reads correctly
 * over any accent color.
 */
import type { CSSProperties } from 'react'

interface AppLogoProps {
  /** Tailwind height class, e.g. "h-8". Width scales proportionally (viewBox ≈ 1.17:1). */
  className?: string
  style?: CSSProperties
}

export function AppLogo({ className = 'h-8', style }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 481.42 412.81"
      className={className}
      style={{ display: 'block', fillRule: 'evenodd', clipRule: 'evenodd', ...style }}
      aria-label="Austin's Diary"
      role="img"
    >
      {/* Main logo shape — tracks the active theme accent color */}
      <path
        fill="var(--color-accent)"
        d="M481.42 9.84c-45.84,-11.79 -123.89,-20.06 -190.96,18.4 52.73,78.41 81.6,169.73 86.8,289.79l-61.44 0c-0.59,-27.11 -2.5,-52.01 -5.58,-74.85l-0.56 0.28c-27.86,7.89 -46.19,18.09 -68.77,34.74l-0.41 0.21c-22.53,-16.64 -40.79,-26.87 -68.41,-34.76l-0.91 -0.47c-3.07,22.85 -5,47.74 -5.58,74.85l-61.44 0c5.22,-120.36 33.65,-211.35 86.63,-289.89 -67.03,-38.35 -144.99,-30.08 -190.79,-18.31l0 363.32c99.31,-18.57 179.54,-5.43 240.57,39.65l0.14 -0.18 0.14 0.18c61.03,-45.08 141.26,-58.22 240.57,-39.65l0 -363.32zm-183.12 172.91c-13.43,-49.75 -33.63,-86.68 -57.61,-113.8 -1.55,1.77 -3.09,3.58 -4.61,5.44 -21.86,26.45 -40.27,61.59 -52.83,107.84 22.21,7.47 38.62,17.12 58.29,31.65 19.22,-14.2 35.32,-23.73 56.75,-31.13z"
      />
      {/* Highlight detail */}
      <path
        fill="rgba(255,255,255,0.5)"
        d="M240.69 68.96c15.89,-16.45 32.28,-30.86 49.77,-40.71 7.42,11.04 14.37,22.34 20.85,33.94 -23.29,10.95 -36.89,22.63 -49.86,34.34 -6.51,-10.15 -13.46,-19.31 -20.76,-27.57z"
      />
    </svg>
  )
}
