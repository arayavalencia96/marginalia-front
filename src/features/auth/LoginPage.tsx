import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { login } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

const loginSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es obligatorio.').email('Ingresa un correo electrónico válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginLocationState {
  successMessage?: string
}

export function LoginPage() {
  const location = useLocation()
  const successMessage = (location.state as LoginLocationState | null)?.successMessage
  const { signIn } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      signIn(tokens)
    },
  })

  const onSubmit = (values: LoginFormValues): void => {
    loginMutation.mutate(values)
  }

  const continueWithGoogle = (): void => {
    const authorizationUrl = new URL('/oauth2/authorization/google', import.meta.env.VITE_API_BASE_URL)
    window.location.assign(authorizationUrl.toString())
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">Accede a tus anotaciones y libros.</p>

        {successMessage && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
            {successMessage}
          </p>
        )}

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

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Contraseña
            </label>
            <input
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              id="password"
              type="password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <Link className="block text-right text-sm font-medium text-slate-700 underline hover:text-slate-950" to="/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>

          {loginMutation.isError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {getApiErrorMessage(loginMutation.error)}
            </p>
          )}

          <button
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={loginMutation.isPending}
            type="submit"
          >
            {loginMutation.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            o
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            onClick={continueWithGoogle}
            type="button"
          >
            Continuar con Google
          </button>
        </form>
      </section>
    </main>
  )
}
