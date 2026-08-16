let accessToken = ''

export const accessTokenStore = {
  get: (): string => accessToken,
  set: (token: string): void => {
    accessToken = token
  },
  clear: (): void => {
    accessToken = ''
  },
}
