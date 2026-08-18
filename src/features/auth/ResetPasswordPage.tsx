import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { resetPassword } from '../../api/auth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

const resetPasswordSchema = z
  .object({
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    meta: { successMessage: 'Contraseña restablecida correctamente.' },
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { successMessage: 'Contraseña actualizada. Ya puedes iniciar sesión.' },
      })
    },
  })

  const onSubmit = ({ newPassword }: ResetPasswordFormValues): void => {
    if (token) {
      resetPasswordMutation.mutate({ token, newPassword })
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Crear nueva contraseña</h1>

        {!token ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              El enlace de recuperación es inválido o está incompleto.
            </p>
            <Link className="text-sm font-medium text-slate-700 underline hover:text-slate-950" to="/forgot-password">
              Solicitar un nuevo enlace
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
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

            {resetPasswordMutation.isError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {getApiErrorMessage(resetPasswordMutation.error)}
              </p>
            )}

            <button
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={resetPasswordMutation.isPending}
              type="submit"
            >
              {resetPasswordMutation.isPending ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
