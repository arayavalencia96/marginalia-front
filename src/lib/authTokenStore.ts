import type { AuthTokens } from '../types/auth'

let tokens: AuthTokens | undefined

export const authTokenStore = {
  getAccessToken: (): string | undefined => tokens?.accessToken,
  getRefreshToken: (): string | undefined => tokens?.refreshToken,
  set: (nextTokens: AuthTokens): void => {
    tokens = nextTokens
  },
  updateAccessToken: (accessToken: string): void => {
    tokens = { ...tokens, accessToken }
  },
  clear: (): void => {
    tokens = undefined
  },
}
