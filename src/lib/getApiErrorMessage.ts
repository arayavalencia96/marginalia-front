import axios from 'axios'

interface ApiErrorResponse {
  message?: string
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data.message ?? 'No pudimos completar la solicitud. Inténtalo de nuevo.'
  }

  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}
