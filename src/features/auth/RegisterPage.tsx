import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { register as registerAccount } from '../../api/auth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

const registerSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es obligatorio.').email('Ingresa un correo electrónico válido.'),
  username: z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
    .max(50, 'El nombre de usuario no puede superar los 50 caracteres.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede superar los 72 caracteres.'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const registerMutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: ({ email }) => {
      navigate('/verify', { state: { email } })
    },
  })

  const onSubmit = (values: RegisterFormValues): void => {
    registerMutation.mutate(values)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Crear cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">Guarda tus anotaciones de lectura en un solo lugar.</p>

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
            <label className="block text-sm font-medium text-slate-700" htmlFor="username">
              Nombre de usuario
            </label>
            <input
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              id="username"
              type="text"
              aria-invalid={Boolean(errors.username)}
              {...register('username')}
            />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Contraseña
            </label>
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              id="password"
              type="password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {registerMutation.isError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {getApiErrorMessage(registerMutation.error)}
            </p>
          )}

          <button
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={registerMutation.isPending}
            type="submit"
          >
            {registerMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      </section>
    </main>
  )
}
