import { Link } from 'react-router-dom'
import { BookMark } from './BookMark'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand"><BookMark className="size-8" /><div><strong>Marginalia</strong><span>Lecturas que dejan huella.</span></div></div>
        <nav aria-label="Enlaces legales" className="footer-links">
          <Link to="/terms">Términos y condiciones</Link>
          <Link to="/privacy">Privacidad</Link>
          <Link to="/cookies">Cookies</Link>
        </nav>
        <p>© {new Date().getFullYear()} Marginalia</p>
      </div>
    </footer>
  )
}
