import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, refreshSession } from '../../api/auth'
import { getCurrentUser } from '../../api/users'
import { registerSessionExpiredHandler } from '../../lib/authSession'
import { authTokenStore } from '../../lib/authTokenStore'
import type { AuthenticatedUser } from '../../types/auth'
import { authContext, type AuthContextValue } from './authContextDefinition'

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthenticatedUser>()
  const [isInitializing, setIsInitializing] = useState(true)

  const clearSession = useCallback((): void => {
    authTokenStore.clear()
    setUser(undefined)
  }, [])

  const refreshUser = useCallback(async (): Promise<void> => {
    setUser(await getCurrentUser())
  }, [])

  const signIn = useCallback(async (accessToken: string): Promise<void> => {
    authTokenStore.set(accessToken)
    try {
      await refreshUser()
    } catch (error) {
      authTokenStore.clear()
      throw error
    }
  }, [refreshUser])

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  useEffect(() => {
    let isCurrent = true

    const restoreSession = async (): Promise<void> => {
      try {
        const { accessToken } = await refreshSession()
        if (isCurrent) await signIn(accessToken)
      } catch {
        if (isCurrent) clearSession()
      } finally {
        if (isCurrent) setIsInitializing(false)
      }
    }

    void restoreSession()

    return () => {
      isCurrent = false
    }
  }, [clearSession, signIn])

  useEffect(
    () =>
      registerSessionExpiredHandler(() => {
        clearSession()
        navigate('/login', { replace: true })
      }),
    [clearSession, navigate],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      signIn,
      signOut,
      refreshUser,
    }),
    [isInitializing, refreshUser, signIn, signOut, user],
  )

  return <authContext.Provider value={value}>{children}</authContext.Provider>
}
