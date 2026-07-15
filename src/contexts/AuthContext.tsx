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
  /** True when the current session was started via a password-reset link. */
  isPasswordRecovery: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Returns whether email confirmation is still required. */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  /** Sends a password-reset email with a link back to the app. */
  resetPasswordForEmail: (email: string) => Promise<void>
  /** Sets a new password for the currently authenticated user (works in recovery or normal session). */
  updatePassword: (newPassword: string) => Promise<void>
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
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
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked a password-reset link — show the reset form, don't navigate away
        setIsPasswordRecovery(true)
        return
      }
      if (event === 'SIGNED_IN' && session?.user) {
        acceptInvites(session.user.id)
        fetchUserProfile(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        setUserProfile(null)
        setUserProfileLoaded(true)
        setIsPasswordRecovery(false)
      }
      if (event === 'USER_UPDATED') {
        // Password was updated — clear recovery mode and resume normal flow
        setIsPasswordRecovery(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUserProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // acceptInvites will be called via onAuthStateChange SIGNED_IN event
  }

  async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
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
    // If email confirmation is disabled in Supabase, a session is returned immediately.
    return { needsConfirmation: !res.data.session }
  }

  async function resetPasswordForEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    // USER_UPDATED event in onAuthStateChange will clear isPasswordRecovery
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    acceptedForUser.current.clear()
  }

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, loading, inviteVersion,
      userProfile, userProfileLoaded, isPasswordRecovery,
      signIn, signUp, signOut, resetPasswordForEmail, updatePassword, reloadUserProfile,
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
