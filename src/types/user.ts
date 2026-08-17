export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ChangeEmailRequest {
  newEmail: string
  password: string
}

export interface ChangeUsernameRequest {
  username: string
}

export interface DeleteAccountRequest {
  password: string
}
