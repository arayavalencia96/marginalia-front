import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { changeEmail, changePassword, changeUsername, deleteAccount } from '../../api/users'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.').max(72, 'La nueva contraseña no puede superar los 72 caracteres.'),
  confirmNewPassword: z.string().min(1, 'Confirma la nueva contraseña.'),
}).refine((values) => values.newPassword === values.confirmNewPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmNewPassword'],
})
const changeEmailSchema = z.object({
  newEmail: z.string().min(1, 'El correo electrónico es obligatorio.').email('Ingresa un correo electrónico válido.').max(320),
  password: z.string().min(1, 'Confirma tu contraseña actual.'),
})
const changeUsernameSchema = z.object({
  username: z.string().trim().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(50, 'El nombre de usuario no puede superar los 50 caracteres.'),
})
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Confirma tu contraseña actual.'),
})

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>
type ChangeUsernameFormValues = z.infer<typeof changeUsernameSchema>
type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>

const inputClassName = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200'
const submitClassName = 'w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400'

export function AccountSettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const passwordForm = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) })
  const emailForm = useForm<ChangeEmailFormValues>({ resolver: zodResolver(changeEmailSchema) })
  const usernameForm = useForm<ChangeUsernameFormValues>({ resolver: zodResolver(changeUsernameSchema) })
  const deleteAccountForm = useForm<DeleteAccountFormValues>({ resolver: zodResolver(deleteAccountSchema) })
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false)

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      signOut()
      navigate('/login', { replace: true, state: { successMessage: 'Contraseña actualizada. Inicia sesión nuevamente.' } })
    },
  })
  const changeEmailMutation = useMutation({
    mutationFn: changeEmail,
    onSuccess: (_response, request) => {
      signOut()
      navigate('/verify', { replace: true, state: { email: request.newEmail } })
    },
  })
  const changeUsernameMutation = useMutation({ mutationFn: changeUsername })
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      signOut()
      navigate('/goodbye', { replace: true })
    },
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Configuración de la cuenta</h1><p className="mt-2 text-sm text-slate-600">Actualiza tus credenciales e identidad de cuenta.</p></div>

      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Nombre de usuario</h2><p className="mt-1 text-sm text-slate-600">Debe ser único y tener entre 3 y 50 caracteres.</p>
          <form className="mt-6 space-y-5" noValidate onSubmit={usernameForm.handleSubmit((values) => changeUsernameMutation.mutate(values))}>
            <div><label className="block text-sm font-medium text-slate-700" htmlFor="username">Nombre de usuario</label><input autoComplete="username" className={inputClassName} id="username" aria-invalid={Boolean(usernameForm.formState.errors.username)} {...usernameForm.register('username')} />{usernameForm.formState.errors.username && <p className="mt-1 text-sm text-red-600">{usernameForm.formState.errors.username.message}</p>}</div>
            {changeUsernameMutation.isError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(changeUsernameMutation.error)}</p>}
            {changeUsernameMutation.isSuccess && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Nombre de usuario actualizado.</p>}
            <button className={submitClassName} disabled={changeUsernameMutation.isPending} type="submit">{changeUsernameMutation.isPending ? 'Actualizando...' : 'Actualizar nombre de usuario'}</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Correo electrónico</h2><p className="mt-1 text-sm text-slate-600">Por seguridad, tendrás que verificar el nuevo correo antes de volver a iniciar sesión.</p>
          <form className="mt-6 space-y-5" noValidate onSubmit={emailForm.handleSubmit((values) => changeEmailMutation.mutate(values))}>
            <div><label className="block text-sm font-medium text-slate-700" htmlFor="new-email">Nuevo correo electrónico</label><input autoComplete="email" className={inputClassName} id="new-email" type="email" aria-invalid={Boolean(emailForm.formState.errors.newEmail)} {...emailForm.register('newEmail')} />{emailForm.formState.errors.newEmail && <p className="mt-1 text-sm text-red-600">{emailForm.formState.errors.newEmail.message}</p>}</div>
            <div><label className="block text-sm font-medium text-slate-700" htmlFor="email-password">Contraseña actual</label><input autoComplete="current-password" className={inputClassName} id="email-password" type="password" aria-invalid={Boolean(emailForm.formState.errors.password)} {...emailForm.register('password')} />{emailForm.formState.errors.password && <p className="mt-1 text-sm text-red-600">{emailForm.formState.errors.password.message}</p>}</div>
            {changeEmailMutation.isError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(changeEmailMutation.error)}</p>}
            <button className={submitClassName} disabled={changeEmailMutation.isPending} type="submit">{changeEmailMutation.isPending ? 'Actualizando correo...' : 'Actualizar correo y verificar'}</button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Contraseña</h2><p className="mt-1 text-sm text-slate-600">Al actualizarla se cerrará tu sesión en todos los dispositivos.</p>
          <form className="mt-6 space-y-5" noValidate onSubmit={passwordForm.handleSubmit(({ currentPassword, newPassword }) => changePasswordMutation.mutate({ currentPassword, newPassword }))}>
            <div><label className="block text-sm font-medium text-slate-700" htmlFor="current-password">Contraseña actual</label><input autoComplete="current-password" className={inputClassName} id="current-password" type="password" aria-invalid={Boolean(passwordForm.formState.errors.currentPassword)} {...passwordForm.register('currentPassword')} />{passwordForm.formState.errors.currentPassword && <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>}</div>
            <div><label className="block text-sm font-medium text-slate-700" htmlFor="new-password">Nueva contraseña</label><input autoComplete="new-password" className={inputClassName} id="new-password" type="password" aria-invalid={Boolean(passwordForm.formState.errors.newPassword)} {...passwordForm.register('newPassword')} />{passwordForm.formState.errors.newPassword && <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.newPassword.message}</p>}</div>
            <div><label className="block text-sm font-medium text-slate-700" htmlFor="confirm-new-password">Confirmar nueva contraseña</label><input autoComplete="new-password" className={inputClassName} id="confirm-new-password" type="password" aria-invalid={Boolean(passwordForm.formState.errors.confirmNewPassword)} {...passwordForm.register('confirmNewPassword')} />{passwordForm.formState.errors.confirmNewPassword && <p className="mt-1 text-sm text-red-600">{passwordForm.formState.errors.confirmNewPassword.message}</p>}</div>
            {changePasswordMutation.isError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(changePasswordMutation.error)}</p>}
            <button className={submitClassName} disabled={changePasswordMutation.isPending} type="submit">{changePasswordMutation.isPending ? 'Actualizando contraseña...' : 'Actualizar contraseña'}</button>
          </form>
        </section>

        <section className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-red-950">Eliminar cuenta</h2>
          <p className="mt-1 text-sm text-red-800">Esta acción desactivará tu cuenta y programará la eliminación definitiva de tus datos.</p>
          <form className="mt-6 space-y-5" noValidate onSubmit={deleteAccountForm.handleSubmit(() => setIsDeleteConfirmationOpen(true))}>
            <div><label className="block text-sm font-medium text-red-950" htmlFor="delete-account-password">Confirma tu contraseña</label><input autoComplete="current-password" className={inputClassName} id="delete-account-password" type="password" aria-invalid={Boolean(deleteAccountForm.formState.errors.password)} {...deleteAccountForm.register('password')} />{deleteAccountForm.formState.errors.password && <p className="mt-1 text-sm text-red-700">{deleteAccountForm.formState.errors.password.message}</p>}</div>
            <button className="w-full rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-400" type="submit">Eliminar mi cuenta</button>
          </form>
        </section>
      </div>

      {isDeleteConfirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section aria-labelledby="delete-account-dialog-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog">
            <h2 className="text-lg font-semibold text-slate-950" id="delete-account-dialog-title">¿Eliminar tu cuenta?</h2>
            <p className="mt-2 text-sm text-slate-600">No podrás iniciar sesión nuevamente. Esta acción desactivará tu cuenta y programará la eliminación definitiva de tus datos.</p>
            {deleteAccountMutation.isError && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(deleteAccountMutation.error)}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed" disabled={deleteAccountMutation.isPending} onClick={() => setIsDeleteConfirmationOpen(false)} type="button">Cancelar</button>
              <button className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-400" disabled={deleteAccountMutation.isPending} onClick={() => deleteAccountMutation.mutate(deleteAccountForm.getValues())} type="button">{deleteAccountMutation.isPending ? 'Eliminando...' : 'Sí, eliminar cuenta'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
