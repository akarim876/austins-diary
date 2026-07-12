import { createContext, useCallback, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  /** Increments each time accept_pending_invites() completes — ProfileContext watches this */
  inviteVersion: number
  /** The logged-in user's display profile (name, username). null = not loaded yet or doesn't exist. */
  userProfile: UserProfile | null
  /** False while user_profiles is still being fetched. */
  userProfileLoaded: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Call after the user saves their profile on CompleteProfilePage */
  reloadUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]               = useState<Session | null>(null)
  const [loading, setLoading]               = useState(true)
  const [inviteVersion, setInviteVersion]   = useState(0)
  const [userProfile, setUserProfile]       = useState<UserProfile | null>(null)
  const [userProfileLoaded, setUserProfileLoaded] = useState(false)
  // Track which user IDs we've already run accept_pending_invites for
  // so we don't call it repeatedly on token refreshes.
  const acceptedForUser = useRef<Set<string>>(new Set())

  async function acceptInvites(userId: string) {
    if (acceptedForUser.current.has(userId)) return
    acceptedForUser.current.add(userId)
    const { error } = await supabase.rpc('accept_pending_invites')
    if (error) console.error('accept_pending_invites:', error)
    setInviteVersion(v => v + 1)
  }

  const fetchUserProfile = useCallback(async (userId: string) => {
    setUserProfileLoaded(false)
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setUserProfile(data as UserProfile | null)
    setUserProfileLoaded(true)
  }, [])

  async function reloadUserProfile() {
    const userId = session?.user?.id
    if (userId) await fetchUserProfile(userId)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) {
        acceptInvites(data.session.user.id)
        fetchUserProfile(data.session.user.id)
      } else {
        setUserProfileLoaded(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' && session?.user) {
        acceptInvites(session.user.id)
        fetchUserProfile(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        setUserProfile(null)
        setUserProfileLoaded(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUserProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // acceptInvites will be called via onAuthStateChange SIGNED_IN event
  }

  async function signUp(email: string, password: string) {
    const res = await supabase.auth.signUp({ email, password })
    if (res.error) throw res.error
    // Supabase "ghost success": email already exists but they don't reveal it.
    // identities === [] means no new account was created — user should sign in instead.
    if ((res.data?.user?.identities?.length ?? 1) === 0) {
      throw new Error(
        'An account with this email already exists. Please sign in instead — ' +
        'if you were invited, use the link from your invite email or sign in with your password.'
      )
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    acceptedForUser.current.clear()
  }

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, loading, inviteVersion,
      userProfile, userProfileLoaded,
      signIn, signUp, signOut, reloadUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
