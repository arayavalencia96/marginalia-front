import type { AuthTokens } from '../types/auth'

let tokens: AuthTokens | undefined

/**
 * In-memory storage for the current session tokens. Values are intentionally not persisted
 * across browser reloads.
 */
export const authTokenStore = {
  /**
   * Reads the current access token.
   *
   * @returns The access token, when a session is active.
   */
  getAccessToken: (): string | undefined => tokens?.accessToken,
  /**
   * Reads the current refresh token.
   *
   * @returns The refresh token, when one is available.
   */
  getRefreshToken: (): string | undefined => tokens?.refreshToken,
  /**
   * Replaces the stored session tokens.
   *
   * @param nextTokens - The tokens received after authentication or refresh.
   * @returns Nothing.
   */
  set: (nextTokens: AuthTokens): void => {
    tokens = nextTokens
  },
  /**
   * Replaces only the access token while retaining the current refresh token.
   *
   * @param accessToken - The renewed access token.
   * @returns Nothing.
   */
  updateAccessToken: (accessToken: string): void => {
    tokens = { ...tokens, accessToken }
  },
  /**
   * Removes all in-memory authentication tokens.
   *
   * @returns Nothing.
   */
  clear: (): void => {
    tokens = undefined
  },
}
