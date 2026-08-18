import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem('marginalia-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('marginalia-theme', theme)
    window.dispatchEvent(new Event('marginalia-theme-change'))
  }, [theme])

  const nextTheme = theme === 'light' ? 'dark' : 'light'

  return (
    <button
      aria-label={`Activar modo ${nextTheme === 'dark' ? 'oscuro' : 'claro'}`}
      className="theme-toggle"
      onClick={() => setTheme(nextTheme)}
      title={`Activar modo ${nextTheme === 'dark' ? 'oscuro' : 'claro'}`}
      type="button"
    >
      <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
    </button>
  )
}
