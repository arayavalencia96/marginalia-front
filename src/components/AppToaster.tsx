import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function AppToaster() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    const updateTheme = (): void => setTheme(currentTheme())
    window.addEventListener('marginalia-theme-change', updateTheme)
    return () => window.removeEventListener('marginalia-theme-change', updateTheme)
  }, [])

  return <Toaster closeButton position="bottom-right" richColors theme={theme} />
}
