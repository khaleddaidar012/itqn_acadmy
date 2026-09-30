'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem('daidar-theme') as Theme | null
      if (stored === 'dark') {
        setThemeState('dark')
        applyTheme('dark')
      } else {
        setThemeState('light')
        applyTheme('light')
      }
    } catch {
      // ignore localStorage errors
    }
  }, [])

  function applyTheme(t: Theme) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (t === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setThemeState(next)
    applyTheme(next)
    try {
      localStorage.setItem('daidar-theme', next)
    } catch {}
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    applyTheme(t)
    try {
      localStorage.setItem('daidar-theme', t)
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
