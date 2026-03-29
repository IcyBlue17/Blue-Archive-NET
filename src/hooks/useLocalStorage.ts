import { useCallback, useState } from 'react'

export function useLocalStorageState(key: string, initial: string) {
  const [value, setValueState] = useState(() => localStorage.getItem(key) ?? initial)

  const setValue = useCallback(
    (next: string | ((prev: string) => string)) => {
      setValueState((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: string) => string)(prev) : next
        localStorage.setItem(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, setValue] as const
}
