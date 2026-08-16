import axios, {
  HttpStatusCode,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { RefreshResponse } from '../types/auth'
import { expireAuthSession } from './authSession'
import { authTokenStore } from './authTokenStore'

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

let refreshPromise: Promise<string> | undefined

const attachAccessToken = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const accessToken = authTokenStore.getAccessToken()

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
}

function refreshAccessToken(refreshToken: string | undefined): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshResponse>('/api/auth/refresh', refreshToken ? { refreshToken } : undefined)
      .then(({ data }) => data.accessToken)
      .finally(() => {
        refreshPromise = undefined
      })
  }

  return refreshPromise
}

const handleResponseError = async (error: AxiosError): Promise<AxiosResponse> => {
  const originalRequest = error.config as RetriableRequestConfig | undefined
  const refreshToken = authTokenStore.getRefreshToken()

  if (
    error.response?.status !== HttpStatusCode.Unauthorized ||
    !originalRequest ||
    originalRequest._retry ||
    originalRequest.url?.includes('/api/auth/refresh')
  ) {
    return Promise.reject(error)
  }

  originalRequest._retry = true

  try {
    const accessToken = await refreshAccessToken(refreshToken)
    authTokenStore.updateAccessToken(accessToken)
    originalRequest.headers.set('Authorization', `Bearer ${accessToken}`)

    return apiClient.request(originalRequest)
  } catch {
    expireAuthSession()
    return Promise.reject(error)
  }
}

apiClient.interceptors.request.use(attachAccessToken)
apiClient.interceptors.response.use((response) => response, handleResponseError)
