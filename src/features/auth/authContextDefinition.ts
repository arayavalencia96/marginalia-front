import { createContext } from 'react'
import type { AuthenticatedUser } from '../../types/auth'

export interface AuthContextValue {
  user: AuthenticatedUser | undefined
  isAuthenticated: boolean
  isInitializing: boolean
  signIn: (accessToken: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const authContext = createContext<AuthContextValue | undefined>(undefined)
