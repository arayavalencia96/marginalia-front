import { Link } from 'react-router-dom'

export function GoodbyePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tu cuenta fue eliminada</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Lamentamos verte partir. Tus datos quedarán programados para eliminación permanente según la política de retención.</p>
        <Link className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700" to="/">Volver al inicio</Link>
      </section>
    </main>
  )
}
