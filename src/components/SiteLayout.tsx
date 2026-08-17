import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1"><Outlet /></div>
      <Footer />
    </div>
  )
}
