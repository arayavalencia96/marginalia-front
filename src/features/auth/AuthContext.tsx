import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { registerSessionExpiredHandler } from '../../lib/authSession'
import { authTokenStore } from '../../lib/authTokenStore'
import type { AuthenticatedUser, AuthTokens } from '../../types/auth'
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
  const [user, setUser] = useState<AuthenticatedUser | undefined>(() => {
    const accessToken = authTokenStore.getAccessToken()
    return accessToken ? getUserFromAccessToken(accessToken) : undefined
  })

  const signIn = useCallback((tokens: AuthTokens): void => {
    authTokenStore.set(tokens)
    setUser(getUserFromAccessToken(tokens.accessToken))
  }, [])

  const signInWithAccessToken = useCallback((accessToken: string): void => {
    authTokenStore.updateAccessToken(accessToken)
    setUser(getUserFromAccessToken(accessToken))
  }, [])

  const signOut = useCallback((): void => {
    authTokenStore.clear()
    setUser(undefined)
  }, [])

  useEffect(
    () =>
      registerSessionExpiredHandler(() => {
        signOut()
        navigate('/login', { replace: true })
      }),
    [navigate, signOut],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      signIn,
      signInWithAccessToken,
      signOut,
    }),
    [signIn, signInWithAccessToken, signOut, user],
  )

  return <authContext.Provider value={value}>{children}</authContext.Provider>
}
