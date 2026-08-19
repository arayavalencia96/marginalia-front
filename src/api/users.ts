import { apiClient } from '../lib/apiClient'
import type { AuthenticatedUser } from '../types/auth'
import type { ChangeEmailRequest, ChangePasswordRequest, ChangeUsernameRequest, DeleteAccountRequest } from '../types/user'

/**
 * Fetches the authenticated user's current profile.
 *
 * @returns The current profile and its available credential capabilities.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const { data } = await apiClient.get<AuthenticatedUser>('/api/users/me')
  return data
}

/**
 * Changes the authenticated user's password.
 *
 * @param request - The current password and desired new password.
 * @returns A promise that resolves when the password is updated.
 */
export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiClient.patch('/api/users/me/password', request)
}

/**
 * Changes the authenticated user's email address.
 *
 * @param request - The new email address and password confirmation.
 * @returns A promise that resolves when the email change is accepted.
 */
export async function changeEmail(request: ChangeEmailRequest): Promise<void> {
  await apiClient.patch('/api/users/me/email', request)
}

/**
 * Changes the authenticated user's unique username.
 *
 * @param request - The desired username.
 * @returns A promise that resolves when the username is updated.
 */
export async function changeUsername(request: ChangeUsernameRequest): Promise<void> {
  await apiClient.patch('/api/users/me/username', request)
}

/**
 * Requests soft deletion of the authenticated user's account.
 *
 * @param request - Password confirmation when the account has a local password.
 * @returns A promise that resolves when the account is scheduled for deletion.
 */
export async function deleteAccount(request: DeleteAccountRequest): Promise<void> {
  await apiClient.delete('/api/users/me', { data: request })
}
