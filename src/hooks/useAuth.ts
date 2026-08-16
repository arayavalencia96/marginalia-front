import { useContext } from 'react'
import { authContext, type AuthContextValue } from '../features/auth/authContextDefinition'

export function useAuth(): AuthContextValue {
  const context = useContext(authContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
