import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24">
      <path d="M21.8 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.5a4.7 4.7 0 0 1-2.04 3.08v2.53h3.3c1.94-1.78 3.04-4.4 3.04-7.45Z" fill="#4285F4" />
      <path d="M12 22c2.76 0 5.08-.92 6.77-2.48l-3.31-2.53c-.92.62-2.09.98-3.46.98-2.67 0-4.93-1.8-5.74-4.22H2.84v2.61A10.23 10.23 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.26 13.75A6.15 6.15 0 0 1 5.94 12c0-.61.11-1.2.32-1.75V7.64H2.84A10.03 10.03 0 0 0 1.8 12c0 1.56.37 3.04 1.04 4.36l3.42-2.61Z" fill="#FBBC05" />
      <path d="M12 6.03c1.5 0 2.85.52 3.91 1.53l2.94-2.94A9.86 9.86 0 0 0 12 2a10.23 10.23 0 0 0-9.16 5.64l3.42 2.61C7.07 7.83 9.33 6.03 12 6.03Z" fill="#EA4335" />
    </svg>
  )
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
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
    meta: { successMessage: 'Sesión iniciada correctamente.' },
    onSuccess: async ({ accessToken }) => {
      await signIn(accessToken)
      navigate('/books', { replace: true })
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
            className="flex w-full items-center justify-center gap-3 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            onClick={continueWithGoogle}
            type="button"
          >
            <GoogleIcon />
            Continuar con Google
          </button>
        </form>
      </section>
    </main>
  )
}
