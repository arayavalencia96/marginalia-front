import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isInitializing } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  useEffect(() => {
    if (isInitializing) {
      return
    }

    if (isAuthenticated) {
      navigate('/books', { replace: true })
    } else {
      setErrorMessage('No pudimos recuperar la sesión de Google. Intenta iniciar sesión nuevamente.')
    }
  }, [isAuthenticated, isInitializing, navigate])

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        {errorMessage ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              No pudimos iniciar sesión con Google
            </h1>
            <p className="mt-3 text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
            <button
              className="mt-6 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              onClick={() => navigate('/login', { replace: true })}
              type="button"
            >
              Volver a iniciar sesión
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Completando inicio de sesión
            </h1>
            <p className="mt-3 text-sm text-slate-600">Espera un momento...</p>
          </>
        )}
      </section>
    </main>
  )
}
