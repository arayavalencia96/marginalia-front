import { apiClient } from '../lib/apiClient'
import type {
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '../types/auth'

/**
 * Registers a new account.
 *
 * @param request - The registration credentials and profile data.
 * @returns The registration response from the API.
 */
export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/auth/register', request)
  return data
}

/**
 * Authenticates an account with email and password.
 *
 * @param request - The account credentials.
 * @returns The issued access and refresh tokens.
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/login', request)
  return data
}

/**
 * Verifies an account email address with its confirmation code.
 *
 * @param request - The email address and verification code.
 * @returns A promise that resolves when the account is verified.
 */
export async function verifyAccount(request: VerifyEmailRequest): Promise<void> {
  await apiClient.post('/api/auth/verify', request)
}

/**
 * Requests a password-reset email for an account.
 *
 * @param request - The email address that should receive the reset instructions.
 * @returns A promise that resolves when the reset request is accepted.
 */
export async function requestPasswordReset(request: ForgotPasswordRequest): Promise<void> {
  await apiClient.post('/api/auth/forgot-password', request)
}

/**
 * Resets an account password using a valid reset token.
 *
 * @param request - The reset token and new password.
 * @returns A promise that resolves when the password is updated.
 */
export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await apiClient.post('/api/auth/reset-password', request)
}

/**
 * Exchanges the current refresh credential for a new access token.
 *
 * @returns The refreshed session tokens.
 */
export async function refreshSession(): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/api/auth/refresh')
  return data
}

/**
 * Revokes the browser refresh credential and clears its HttpOnly cookie.
 *
 * @returns A promise that resolves after the server closes the session.
 */
export async function logout(): Promise<void> {
  await apiClient.post('/api/auth/logout')
}
