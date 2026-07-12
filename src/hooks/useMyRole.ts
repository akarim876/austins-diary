import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export type ProfileRole = 'owner' | 'editor' | 'viewer'

/**
 * Returns the current user's role for the given profile.
 * null while loading or if the user has no access.
 */
export function useMyRole(profileId: string | null): ProfileRole | null {
  const { user } = useAuth()
  const [role, setRole] = useState<ProfileRole | null>(null)

  const load = useCallback(async () => {
    if (!profileId || !user) { setRole(null); return }
    const { data } = await supabase
      .from('profile_access')
      .select('role')
      .eq('profile_id', profileId)
      .eq('user_id', user.id)
      .maybeSingle()
    setRole((data?.role as ProfileRole) ?? null)
  }, [profileId, user])

  useEffect(() => { load() }, [load])

  return role
}

/**
 * Convenience checks based on role.
 */
export function canCreate(role: ProfileRole | null): boolean {
  return role === 'owner' || role === 'editor'
}

/**
 * Can this user edit/delete a specific log entry?
 * Owners: yes always.
 * Editors: only their own entries, only for today's date.
 */
export function canEditEntry(
  role: ProfileRole | null,
  authorId: string,
  entryDate: string,  // 'yyyy-MM-dd'
  currentUserId: string | undefined,
  today: string,
): boolean {
  if (!role || !currentUserId) return false
  if (role === 'viewer') return false
  if (role === 'owner') return true
  // editor: own entry, today only
  return authorId === currentUserId && entryDate === today
}

/**
 * Same as canEditEntry but with a 1-day grace for sleep drafts.
 */
export function canEditSleepEntry(
  role: ProfileRole | null,
  authorId: string,
  logDate: string,
  currentUserId: string | undefined,
  today: string,
  yesterday: string,
): boolean {
  if (!role || !currentUserId) return false
  if (role === 'viewer') return false
  if (role === 'owner') return true
  return authorId === currentUserId && (logDate === today || logDate === yesterday)
}
