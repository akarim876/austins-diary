import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function emailToDisplayName(email: string): string {
  const local = email.split('@')[0]
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Returns a Map<userId, displayName> for every caregiver who has access to
 * the given profile.
 * Prefers full name from user_profiles; falls back to email in profile_access.
 */
export function useProfileMembers(profileId: string | null): Map<string, string> {
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map())

  const load = useCallback(async () => {
    if (!profileId) return

    // Fetch profile_access (gives us user_id + email fallback)
    const { data: accessRows } = await supabase
      .from('profile_access')
      .select('user_id, email')
      .eq('profile_id', profileId)

    if (!accessRows?.length) return

    const userIds = accessRows.map(r => r.user_id).filter(Boolean)

    // Fetch user_profiles for all those user IDs (single round-trip)
    const { data: profileRows } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, username')
      .in('user_id', userIds)

    const nameByUserId = new Map<string, string>()
    for (const p of profileRows ?? []) {
      const full = `${p.first_name} ${p.last_name}`.trim()
      nameByUserId.set(p.user_id, full || `@${p.username}`)
    }

    const map = new Map<string, string>()
    for (const row of accessRows) {
      if (!row.user_id) continue
      // Prefer user_profiles name; fall back to email-derived name
      const name = nameByUserId.get(row.user_id)
        ?? (row.email ? emailToDisplayName(row.email) : null)
      if (name) map.set(row.user_id, name)
    }
    setMemberMap(map)
  }, [profileId])

  useEffect(() => { load() }, [load])

  return memberMap
}
