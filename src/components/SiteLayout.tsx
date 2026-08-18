import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'

export function SiteLayout() {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-content"><Outlet /></div>
      <Footer />
    </div>
  )
}
