interface Props {
  /** Roughly 0..1 values, one per bar — see `useVoiceRecorder`'s `levels`. */
  levels: number[]
  /** Bar color. Defaults to the current text color. */
  color?: string
  className?: string
  minHeightPx?: number
  maxHeightPx?: number
}

/**
 * Small live amplitude meter — a handful of bars that grow/shrink with the
 * mic input level while recording, so the user gets an immediate signal
 * that their mic is actually picking up sound (rather than a generic
 * "recording" pulse that animates the same way whether they're speaking,
 * silent, or muted).
 */
export function AudioLevelBars({ levels, color = 'currentColor', className, minHeightPx = 4, maxHeightPx = 16 }: Props) {
  return (
    <span className={`inline-flex items-center gap-[3px] ${className ?? ''}`} aria-hidden="true">
      {levels.map((level, i) => {
        const height = minHeightPx + Math.max(0, Math.min(1, level)) * (maxHeightPx - minHeightPx)
        return (
          <span
            key={i}
            className="w-[3px] rounded-full transition-[height] duration-75 ease-out"
            style={{ height, background: color }}
          />
        )
      })}
    </span>
  )
}
