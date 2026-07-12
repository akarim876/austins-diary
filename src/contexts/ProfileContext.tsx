import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ChildProfile } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface ProfileContextValue {
  profiles: ChildProfile[]
  activeProfile: ChildProfile | null
  setActiveProfile: (profile: ChildProfile) => void
  loading: boolean
  refresh: () => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, inviteVersion } = useAuth()
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!user) {
      setProfiles([])
      setActiveProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('child_profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error)
        const list = (data ?? []) as ChildProfile[]
        setProfiles(list)
        // Auto-select first profile, but don't override an existing selection
        // unless it was wiped (e.g. after accepting an invite that added profiles)
        setActiveProfile(prev => {
          if (prev && list.find(p => p.id === prev.id)) return prev
          return list[0] ?? null
        })
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tick, inviteVersion])

  function refresh() {
    setTick(t => t + 1)
  }

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, setActiveProfile, loading, refresh }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
