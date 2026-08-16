import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { changePassword } from '../../api/users'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
      .max(72, 'La nueva contraseña no puede superar los 72 caracteres.'),
    confirmNewPassword: z.string().min(1, 'Confirma la nueva contraseña.'),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmNewPassword'],
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export function AccountSettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  })

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      signOut()
      navigate('/login', {
        replace: true,
        state: { successMessage: 'Contraseña actualizada. Inicia sesión nuevamente.' },
      })
    },
  })

  const onSubmit = ({ currentPassword, newPassword }: ChangePasswordFormValues): void => {
    changePasswordMutation.mutate({ currentPassword, newPassword })
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Configuración de la cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">Actualiza la contraseña de tu cuenta.</p>

        <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="current-password">
              Contraseña actual
            </label>
            <input
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              id="current-password"
              type="password"
              aria-invalid={Boolean(errors.currentPassword)}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="new-password">
              Nueva contraseña
            </label>
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              id="new-password"
              type="password"
              aria-invalid={Boolean(errors.newPassword)}
              {...register('newPassword')}
            />
            {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="confirm-new-password">
              Confirmar nueva contraseña
            </label>
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              id="confirm-new-password"
              type="password"
              aria-invalid={Boolean(errors.confirmNewPassword)}
              {...register('confirmNewPassword')}
            />
            {errors.confirmNewPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmNewPassword.message}</p>
            )}
          </div>

          {changePasswordMutation.isError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {getApiErrorMessage(changePasswordMutation.error)}
            </p>
          )}

          <button
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={changePasswordMutation.isPending}
            type="submit"
          >
            {changePasswordMutation.isPending ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}
