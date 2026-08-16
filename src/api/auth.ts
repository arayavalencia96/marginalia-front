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

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/auth/register', request)
  return data
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/login', request)
  return data
}

export async function verifyAccount(request: VerifyEmailRequest): Promise<void> {
  await apiClient.post('/api/auth/verify', request)
}

export async function requestPasswordReset(request: ForgotPasswordRequest): Promise<void> {
  await apiClient.post('/api/auth/forgot-password', request)
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await apiClient.post('/api/auth/reset-password', request)
}

export async function refreshSession(): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/api/auth/refresh')
  return data
}
