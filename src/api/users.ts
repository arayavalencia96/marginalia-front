import { apiClient } from '../lib/apiClient'
import type { ChangeEmailRequest, ChangePasswordRequest, ChangeUsernameRequest, DeleteAccountRequest } from '../types/user'

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiClient.patch('/api/users/me/password', request)
}

export async function changeEmail(request: ChangeEmailRequest): Promise<void> {
  await apiClient.patch('/api/users/me/email', request)
}

export async function changeUsername(request: ChangeUsernameRequest): Promise<void> {
  await apiClient.patch('/api/users/me/username', request)
}

export async function deleteAccount(request: DeleteAccountRequest): Promise<void> {
  await apiClient.delete('/api/users/me', { data: request })
}
