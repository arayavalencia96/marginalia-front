import { useContext } from 'react'
import { authContext, type AuthContextValue } from '../features/auth/authContextDefinition'

/**
 * Provides the authentication state and session actions from the nearest AuthProvider.
 *
 * @returns The current authentication context value.
 * @throws {Error} When rendered outside an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(authContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
