import axios, {
  HttpStatusCode,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { accessTokenStore } from './accessTokenStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

const attachAccessToken = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const accessToken = accessTokenStore.get()

  if (accessToken.length > 0) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
}

const handleUnauthorizedResponse = (error: AxiosError): Promise<never> =>
  Promise.reject(error)

const handleResponseError = (error: AxiosError): Promise<never> => {
  if (error.response?.status === HttpStatusCode.Unauthorized) {
    return handleUnauthorizedResponse(error)
  }

  return Promise.reject(error)
}

apiClient.interceptors.request.use(attachAccessToken)
apiClient.interceptors.response.use((response) => response, handleResponseError)
