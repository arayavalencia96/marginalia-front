import { authTokenStore } from './authTokenStore'

let sessionExpiredHandler: (() => void) | undefined

export function registerSessionExpiredHandler(handler: () => void): () => void {
  sessionExpiredHandler = handler

  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = undefined
    }
  }
}

export function expireAuthSession(): void {
  authTokenStore.clear()

  if (sessionExpiredHandler) {
    sessionExpiredHandler()
    return
  }

  window.location.assign('/login')
}
