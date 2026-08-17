import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Marginalia</p>
        <nav aria-label="Enlaces legales" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className="transition hover:text-slate-950" to="/terms">Términos y condiciones</Link>
          <Link className="transition hover:text-slate-950" to="/privacy">Política de privacidad</Link>
          <Link className="transition hover:text-slate-950" to="/cookies">Política de cookies</Link>
        </nav>
      </div>
    </footer>
  )
}
