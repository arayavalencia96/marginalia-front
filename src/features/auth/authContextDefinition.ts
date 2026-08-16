import { createContext } from 'react'
import type { AuthenticatedUser, AuthTokens } from '../../types/auth'

export interface AuthContextValue {
  user: AuthenticatedUser | undefined
  isAuthenticated: boolean
  signIn: (tokens: AuthTokens) => void
  signInWithAccessToken: (accessToken: string) => void
  signOut: () => void
}

export const authContext = createContext<AuthContextValue | undefined>(undefined)
