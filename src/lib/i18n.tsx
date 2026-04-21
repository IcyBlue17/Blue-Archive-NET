
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Locale = 'zh' | 'en'

type I18nContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const s = localStorage.getItem('locale') as Locale | null
    return s === 'en' || s === 'zh' ? s : 'zh'
  })

  const setLocalePersist = useCallback((l: Locale) => {
    setLocale(l)
    localStorage.setItem('locale', l)
  }, [])

  const value = useMemo(() => ({ locale, setLocale: setLocalePersist }), [locale, setLocalePersist])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
