import { apiClient } from '../lib/apiClient'
import type { ChangePasswordRequest } from '../types/user'

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiClient.patch('/api/users/me/password', request)
}
