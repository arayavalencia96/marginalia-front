import { Link } from 'react-router-dom'

interface LegalPageProps {
  title: string
  description: string
}

const placeholderParagraphs = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non dui vitae ipsum feugiat pellentesque. Donec at suscipit risus, quis egestas magna.',
  'Praesent tempus, lorem at porta facilisis, sem elit auctor lacus, vitae condimentum justo nibh in magna. Integer ut augue vitae sem auctor faucibus.',
  'Suspendisse potenti. Curabitur finibus, nisl vitae facilisis luctus, enim tellus dignissim nunc, a tempor lectus ipsum in libero.',
]

export function LegalPage({ title, description }: LegalPageProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <Link className="back-link" to="/">← Volver al inicio</Link>
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Marginalia</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 text-slate-600">{description}</p>
        <p className="mt-4 text-sm text-slate-500">Última actualización: pendiente</p>
        <div className="mt-8 space-y-6 text-sm leading-6 text-slate-700">
          {placeholderParagraphs.map((paragraph, index) => (
            <section key={paragraph}>
              <h2 className="mb-2 text-base font-semibold text-slate-900">Sección {index + 1}</h2>
              <p>{paragraph}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
