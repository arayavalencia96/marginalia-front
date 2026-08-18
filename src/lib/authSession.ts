import { authTokenStore } from './authTokenStore'

let sessionExpiredHandler: (() => void) | undefined

/**
 * Registers the callback used to update application state after a session expires.
 *
 * @param handler - The callback that clears the UI's authenticated state.
 * @returns A cleanup function that unregisters this handler when it is still active.
 */
export function registerSessionExpiredHandler(handler: () => void): () => void {
  sessionExpiredHandler = handler

  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = undefined
    }
  }
}

/**
 * Clears tokens and notifies the registered UI handler, or redirects to login as a fallback.
 *
 * @returns Nothing.
 */
export function expireAuthSession(): void {
  authTokenStore.clear()

  if (sessionExpiredHandler) {
    sessionExpiredHandler()
    return
  }

  window.location.assign('/login')
}
