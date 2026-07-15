import { useCallback, useEffect, useState } from 'react'

export interface WizardState {
  step: number
  done: boolean
}

function wizardKey(profileId: string): string {
  return `setup_wizard_v1_${profileId}`
}

function readState(profileId: string): WizardState | null {
  try {
    const raw = localStorage.getItem(wizardKey(profileId))
    if (!raw) return null
    return JSON.parse(raw) as WizardState
  } catch {
    return null
  }
}

function writeState(profileId: string, state: WizardState): void {
  try {
    localStorage.setItem(wizardKey(profileId), JSON.stringify(state))
  } catch { /* ignore storage errors */ }
}

/**
 * Tracks whether the owner setup wizard has been shown for a given profile.
 *
 * State transitions:
 *  null              → wizard never seen    → auto-show on first visit
 *  { done: false }   → wizard dismissed mid-flow → show "Complete setup" in Settings
 *  { done: true }    → wizard completed or fully skipped → do not auto-show again
 */
export function useSetupWizard(profileId: string | null) {
  const [state, setState] = useState<WizardState | null>(() =>
    profileId ? readState(profileId) : null
  )

  useEffect(() => {
    setState(profileId ? readState(profileId) : null)
  }, [profileId])

  /** True only the very first time (no state stored). */
  const shouldAutoShow = state === null

  /** True when the wizard was started but not finished — shows "Complete setup" in Settings. */
  const isResumable = state !== null && !state.done

  const savedStep = state?.step ?? 0

  /** Called when the user completes the last wizard step. */
  const markDone = useCallback(() => {
    if (!profileId) return
    const s: WizardState = { step: 7, done: true }
    writeState(profileId, s)
    setState(s)
  }, [profileId])

  /** Called when the user closes the wizard before finishing (saves progress). */
  const dismiss = useCallback((currentStep: number) => {
    if (!profileId) return
    const s: WizardState = { step: currentStep, done: false }
    writeState(profileId, s)
    setState(s)
  }, [profileId])

  /** Re-reads state (used when Settings reopens the wizard). */
  const sync = useCallback(() => {
    setState(profileId ? readState(profileId) : null)
  }, [profileId])

  return { state, shouldAutoShow, isResumable, savedStep, markDone, dismiss, sync }
}
