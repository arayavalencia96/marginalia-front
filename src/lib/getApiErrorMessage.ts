import axios from 'axios'

interface ApiErrorResponse {
  message?: string
}

const translatedMessages: Record<string, string> = {
  'Image could not be uploaded': 'No pudimos subir la imagen. Revisa la configuración de Cloudinary e inténtalo nuevamente.',
  'Invalid email or password': 'El correo electrónico o la contraseña son incorrectos.',
  'User is disabled': 'La cuenta todavía no fue verificada.',
}

/**
 * Converts an unknown request failure into a safe, user-facing message.
 *
 * @param error - The error returned by Axios or another source.
 * @returns The API message when available, otherwise a generic localized message.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.message
    return message ? translatedMessages[message] ?? message : 'No pudimos completar la solicitud. Inténtalo de nuevo.'
  }

  if (error instanceof Error && error.message) {
    return translatedMessages[error.message] ?? error.message
  }

  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}
