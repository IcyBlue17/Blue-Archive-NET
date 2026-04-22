
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE = 'aquanet-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const s = localStorage.getItem(STORAGE) as Theme | null
    if (s === 'light' || s === 'dark') return s
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      return 'dark'
    return 'light'
  })

  useLayoutEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', 'kumo')
    root.classList.toggle('dark', theme === 'dark')

    if (theme === 'dark') root.setAttribute('data-mode', 'dark')
    else root.removeAttribute('data-mode')
    localStorage.setItem(STORAGE, theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme outside ThemeProvider')
  return ctx
}
