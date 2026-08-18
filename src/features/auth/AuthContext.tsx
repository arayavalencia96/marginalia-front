import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, refreshSession } from '../../api/auth'
import { registerSessionExpiredHandler } from '../../lib/authSession'
import { authTokenStore } from '../../lib/authTokenStore'
import type { AuthenticatedUser } from '../../types/auth'
import { authContext, type AuthContextValue } from './authContextDefinition'

interface AccessTokenPayload {
  sub?: unknown
  email?: unknown
}

function getUserFromAccessToken(accessToken: string): AuthenticatedUser | undefined {
  try {
    const payloadSegment = accessToken.split('.')[1]

    if (!payloadSegment) {
      return undefined
    }

    const payloadJson = atob(
      payloadSegment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payloadSegment.length / 4) * 4, '='),
    )
    const payload = JSON.parse(payloadJson) as AccessTokenPayload

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return undefined
    }

    return { id: payload.sub, email: payload.email }
  } catch {
    return undefined
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthenticatedUser>()
  const [isInitializing, setIsInitializing] = useState(true)

  const clearSession = useCallback((): void => {
    authTokenStore.clear()
    setUser(undefined)
  }, [])

  const signIn = useCallback((accessToken: string): void => {
    authTokenStore.set(accessToken)
    setUser(getUserFromAccessToken(accessToken))
  }, [])

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
        if (isCurrent) signIn(accessToken)
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
    }),
    [isInitializing, signIn, signOut, user],
  )

  return <authContext.Provider value={value}>{children}</authContext.Provider>
}
