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

/**
 * Axios client for authenticated API requests, including automatic access-token renewal.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

let refreshPromise: Promise<string> | undefined

/**
 * Adds the in-memory access token to an outgoing request when one is available.
 *
 * @param config - The Axios request configuration to enrich.
 * @returns The request configuration with its Authorization header set when applicable.
 */
const attachAccessToken = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const accessToken = authTokenStore.getAccessToken()

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
}

/**
 * Obtains a fresh access token, sharing an in-flight refresh request across callers.
 *
 * @returns A promise resolving to the new access token.
 */
function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<RefreshResponse>('/api/auth/refresh')
      .then(({ data }) => data.accessToken)
      .finally(() => {
        refreshPromise = undefined
      })
  }

  return refreshPromise
}

/**
 * Retries one unauthorized API request after refreshing the access token.
 *
 * @param error - The Axios error produced by the original request.
 * @returns The retried response when refresh succeeds.
 */
const handleResponseError = async (error: AxiosError): Promise<AxiosResponse> => {
  const originalRequest = error.config as RetriableRequestConfig | undefined

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
    const accessToken = await refreshAccessToken()
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
