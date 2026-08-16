import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { verifyAccount } from '../../api/auth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'

const verifyAccountSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Ingresa el código de 6 dígitos.'),
})

type VerifyAccountFormValues = z.infer<typeof verifyAccountSchema>

interface VerifyAccountLocationState {
  email?: string
}

export function VerifyAccountPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as VerifyAccountLocationState | null)?.email ?? ''
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyAccountFormValues>({
    resolver: zodResolver(verifyAccountSchema),
  })

  const verifyAccountMutation = useMutation({
    mutationFn: verifyAccount,
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { successMessage: 'Tu cuenta fue verificada. Ya puedes iniciar sesión.' },
      })
    },
  })

  const onSubmit = (values: VerifyAccountFormValues): void => {
    verifyAccountMutation.mutate({ email, code: values.code })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Verifica tu cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          {email
            ? `Ingresa el código que enviamos a ${email}.`
            : 'Regístrate antes de verificar tu cuenta.'}
        </p>

        <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="code">
              Código de verificación
            </label>
            <input
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              disabled={!email}
              id="code"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              type="text"
              aria-invalid={Boolean(errors.code)}
              {...register('code', {
                setValueAs: (value: string) => value.replace(/\D/g, ''),
              })}
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
          </div>

          {verifyAccountMutation.isError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {getApiErrorMessage(verifyAccountMutation.error)}
            </p>
          )}

          <button
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!email || verifyAccountMutation.isPending}
            type="submit"
          >
            {verifyAccountMutation.isPending ? 'Verificando...' : 'Verificar cuenta'}
          </button>
        </form>
      </section>
    </main>
  )
}
