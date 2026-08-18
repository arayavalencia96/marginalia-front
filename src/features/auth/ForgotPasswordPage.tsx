import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { requestPasswordReset } from '../../api/auth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es obligatorio.').email('Ingresa un correo electrónico válido.'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const forgotPasswordMutation = useMutation({
    mutationFn: requestPasswordReset,
    meta: { successMessage: 'Si la cuenta existe, recibirás instrucciones por correo.' },
  })

  const onSubmit = (values: ForgotPasswordFormValues): void => {
    forgotPasswordMutation.mutate(values)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>

        {forgotPasswordMutation.isSuccess ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
              Si existe una cuenta con ese correo, recibirás un enlace de recuperación en breve.
            </p>
            <Link className="text-sm font-medium text-slate-700 underline hover:text-slate-950" to="/login">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                Correo electrónico
              </label>
              <input
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                id="email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            {forgotPasswordMutation.isError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {getApiErrorMessage(forgotPasswordMutation.error)}
              </p>
            )}

            <button
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={forgotPasswordMutation.isPending}
              type="submit"
            >
              {forgotPasswordMutation.isPending ? 'Enviando enlace...' : 'Enviar enlace'}
            </button>
            <Link className="block text-center text-sm font-medium text-slate-700 underline hover:text-slate-950" to="/login">
              Volver a iniciar sesión
            </Link>
          </form>
        )}
      </section>
    </main>
  )
}
