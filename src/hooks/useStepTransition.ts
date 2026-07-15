import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

export type TransitionDirection = 'forward' | 'backward'

type Phase = 'entering' | 'visible' | 'exiting'

const DURATION = 250

/**
 * Manages animated step transitions for multi-step wizard flows.
 *
 * Entry animations:
 *   - Intro step (isIntro=true): fade up  (opacity 0→1, translateY(20px)→0)
 *   - Forward step entry:        fade in from right (translateX(30px)→0)
 *   - Backward step entry:       fade in from left  (translateX(-30px)→0)
 *
 * Exit animations:
 *   - Intro step exit:           fade out to left   (translateX(0)→-30px)
 *   - Forward step exit:         fade out to left   (translateX(0)→-30px)
 *   - Backward step exit:        fade out to right  (translateX(0)→30px)
 */
export function useStepTransition(initialStep: number) {
  const [displayStep, setDisplayStep]   = useState(initialStep)
  const [phase, setPhase]               = useState<Phase>('entering')
  const [direction, setDirection]       = useState<TransitionDirection>('forward')
  const [isAnimating, setIsAnimating]   = useState(true)

  // Use a ref so navigate() can read current value without stale closure
  const isAnimatingRef = useRef(true)
  const timer1Ref      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timer2Ref      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const raf1Ref        = useRef<number>(0)
  const raf2Ref        = useRef<number>(0)

  // Initial entry animation on mount
  useEffect(() => {
    raf1Ref.current = requestAnimationFrame(() => {
      raf2Ref.current = requestAnimationFrame(() => {
        setPhase('visible')
        setIsAnimating(false)
        isAnimatingRef.current = false
      })
    })
    return () => {
      cancelAnimationFrame(raf1Ref.current)
      cancelAnimationFrame(raf2Ref.current)
    }
  }, [])

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (timer1Ref.current) clearTimeout(timer1Ref.current)
    if (timer2Ref.current) clearTimeout(timer2Ref.current)
  }, [])

  const navigate = useCallback((newStep: number, dir: TransitionDirection) => {
    if (isAnimatingRef.current) return
    isAnimatingRef.current = true
    setIsAnimating(true)
    setDirection(dir)
    setPhase('exiting')

    timer1Ref.current = setTimeout(() => {
      // Swap content and snap to the entry start position (no transition)
      setDisplayStep(newStep)
      setPhase('entering')

      // Double RAF: let browser paint the entry position before starting transition
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          setPhase('visible')
          // Small buffer past the CSS duration before allowing next interaction
          timer2Ref.current = setTimeout(() => {
            isAnimatingRef.current = false
            setIsAnimating(false)
          }, DURATION + 30)
        })
      })
    }, DURATION)
  }, []) // No dependencies — uses ref for isAnimating and closure-free setState

  /**
   * Returns inline styles for the animated wrapper div.
   * @param isIntro - true when the currently displayed step is the intro (step 0)
   */
  function getStyle(isIntro: boolean): CSSProperties {
    const withTransition: CSSProperties = {
      transition: `opacity ${DURATION}ms ease-out, transform ${DURATION}ms ease-out`,
    }

    if (phase === 'visible') {
      return { ...withTransition, opacity: 1, transform: 'translate(0,0)' }
    }

    if (phase === 'entering') {
      // No transition — snap to start position; browser will transition once phase→visible
      if (isIntro) return { opacity: 0, transform: 'translateY(20px)' }
      const x = direction === 'forward' ? '30px' : '-30px'
      return { opacity: 0, transform: `translateX(${x})` }
    }

    // exiting
    if (isIntro) return { ...withTransition, opacity: 0, transform: 'translateX(-30px)' }
    const x = direction === 'forward' ? '-30px' : '30px'
    return { ...withTransition, opacity: 0, transform: `translateX(${x})` }
  }

  return { displayStep, phase, isAnimating, navigate, getStyle }
}
