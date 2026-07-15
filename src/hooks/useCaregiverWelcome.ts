import { useCallback, useEffect, useState } from 'react'

function welcomeKey(userId: string, profileId: string): string {
  return `caregiver_welcome_v1_${userId}_${profileId}`
}

/**
 * Tracks whether the caregiver welcome flow has been shown to a specific
 * user on a specific profile. Stored per-user per-profile in localStorage.
 */
export function useCaregiverWelcome(userId: string | null, profileId: string | null) {
  const [seen, setSeen] = useState<boolean>(() => {
    if (!userId || !profileId) return true
    return localStorage.getItem(welcomeKey(userId, profileId)) === 'seen'
  })

  useEffect(() => {
    if (!userId || !profileId) { setSeen(true); return }
    setSeen(localStorage.getItem(welcomeKey(userId, profileId)) === 'seen')
  }, [userId, profileId])

  const markSeen = useCallback(() => {
    if (!userId || !profileId) return
    try {
      localStorage.setItem(welcomeKey(userId, profileId), 'seen')
    } catch { /* ignore */ }
    setSeen(true)
  }, [userId, profileId])

  return {
    /** True if the welcome flow should be shown to this user on this profile. */
    shouldShow: !seen,
    markSeen,
  }
}
