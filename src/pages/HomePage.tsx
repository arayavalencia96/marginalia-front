import { Link } from 'react-router-dom'
import { BookMark } from '../components/BookMark'
import { useAuth } from '../hooks/useAuth'

const features = [
  ['Jerarquía flexible', 'Organiza libros, capítulos y subcapítulos con la profundidad que necesites.'],
  ['Contenido enriquecido', 'Combina notas, listas, código, fórmulas, ejercicios e imágenes en un mismo lugar.'],
  ['Lectura confortable', 'Una interfaz cálida y enfocada, con modo oscuro para sesiones de estudio prolongadas.'],
]

export function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Tu biblioteca de ideas</span>
          <h1>Lo importante de cada libro, siempre a mano.</h1>
          <p>Marginalia convierte tus lecturas en conocimiento organizado. Guarda apuntes, conecta capítulos y construye resúmenes que realmente quieras volver a leer.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to={isAuthenticated ? '/books' : '/register'}>{isAuthenticated ? 'Ir a mis libros' : 'Comenzar gratis'}</Link>
            {!isAuthenticated && <Link className="button button-secondary" to="/login">Ya tengo una cuenta</Link>}
          </div>
          <div className="hero-proof"><span>✓ Sin distracciones</span><span>✓ Organizado a tu manera</span><span>✓ Exportable a PDF</span></div>
        </div>

        <div aria-label="Vista conceptual de un cuaderno de lectura" className="hero-visual">
          <div className="floating-note note-one">“Una idea bien anotada<br />puede cambiar una lectura.”</div>
          <div className="book-stack">
            <div className="book-cover">
              <BookMark className="size-16" />
              <div><span>CUADERNO DE LECTURA</span><strong>Ideas que merecen quedarse</strong></div>
            </div>
            <div className="book-pages" />
          </div>
          <div className="floating-note note-two"><strong>12</strong><span>capítulos organizados</span></div>
        </div>
      </section>

      <section className="feature-section">
        <div className="section-heading"><span className="eyebrow">Pensado para estudiar y crear</span><h2>De la lectura dispersa a un sistema propio</h2></div>
        <div className="feature-grid">
          {features.map(([title, description], index) => <article className="feature-card" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>
    </main>
  )
}
