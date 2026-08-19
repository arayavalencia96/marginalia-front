let accessToken: string | undefined

/**
 * In-memory storage for the current access token. Session continuity across reloads is
 * restored with the server-managed HttpOnly refresh cookie.
 */
export const authTokenStore = {
  /**
   * Reads the current access token.
   *
   * @returns The access token, when a session is active.
   */
  getAccessToken: (): string | undefined => accessToken,
  /**
   * Replaces the current access token.
   *
   * @param nextAccessToken - The access token received after authentication or refresh.
   * @returns Nothing.
   */
  set: (nextAccessToken: string): void => {
    accessToken = nextAccessToken
  },
  /**
   * Replaces the current access token.
   *
   * @param accessToken - The renewed access token.
   * @returns Nothing.
   */
  updateAccessToken: (nextAccessToken: string): void => {
    authTokenStore.set(nextAccessToken)
  },
  /**
   * Removes the in-memory access token.
   *
   * @returns Nothing.
   */
  clear: (): void => {
    accessToken = undefined
  },
}
