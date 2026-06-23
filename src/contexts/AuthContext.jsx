import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [synagogue, setSynagogue] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, synagogues(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profile) {
      setProfile(profile)
      setSynagogue(profile.synagogues || null)
    } else {
      setProfile(null)
      setSynagogue(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user)
    }
  }, [session, loadProfile])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user)
      }
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session?.user) {
        await loadProfile(session.user)
      } else {
        setProfile(null)
        setSynagogue(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const isSuperAdmin = profile?.role === 'super_admin'
  const synagogueId = synagogue?.id || profile?.synagogue_id

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      synagogue,
      loading,
      isSuperAdmin,
      synagogueId,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
