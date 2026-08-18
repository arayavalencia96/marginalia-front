import { Link, NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { BookMark } from './BookMark'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, isInitializing, signOut, user } = useAuth()

  async function handleSignOut(): Promise<void> {
    await signOut()
    toast.info('Sesión cerrada correctamente.')
    navigate('/', { replace: true })
  }

  const navClassName = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' nav-link-active' : ''}`

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link aria-label="Marginalia, inicio" className="brand" to="/">
          <BookMark className="size-9" />
          <span>Marginalia</span>
        </Link>

        <nav aria-label="Navegación principal" className="main-nav">
          {isAuthenticated && <NavLink className={navClassName} to="/books">Mis libros</NavLink>}
          {isAuthenticated && <NavLink className={navClassName} to="/account">Mi cuenta</NavLink>}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          {isInitializing ? (
            <span className="user-email" role="status">Verificando sesión...</span>
          ) : isAuthenticated ? (
            <>
              <span className="user-email" title={user?.email}>{user?.email}</span>
              <button className="button button-ghost button-small" onClick={() => void handleSignOut()} type="button">Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link className="button button-ghost button-small" to="/login">Ingresar</Link>
              <Link className="button button-primary button-small" to="/register">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
