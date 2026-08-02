import { useEffect, useRef } from 'react'
import type { TrendEntry } from '@/lib/types'
import { paintChu3CalHeatmap } from '@/lib/chu3CalHeatmap'
import { useAppTexts } from '@/content/texts'
import { Text } from '@/components/ui/Text'

type CalInstance = { destroy: () => Promise<unknown> }

export function PlaysHeatmap({ trend }: { trend: TrendEntry[] }) {
  const texts = useAppTexts()
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const source = trend.map((t) => ({ date: t.date, value: t.plays ?? 0 }))
    if (!source.length) return

    let disposed = false
    let cal: CalInstance | null = null

    void paintChu3CalHeatmap(el, source).then((c) => {
      if (disposed) {
        void c.destroy()
        return
      }
      cal = c
    })

    return () => {
      disposed = true
      void cal?.destroy()
      el.innerHTML = ''
    }
  }, [trend])

  if (!trend.length) {
    return <Text className="text-app-subtle">{texts.gamesPage.noCalendar}</Text>
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="border-app-line bg-emerald-500/[0.07] dark:bg-emerald-400/[0.09] rounded-lg border p-3">
        <div ref={hostRef} className="cal-host min-h-[140px]" />
      </div>
      <div className="text-app-subtle mt-2 text-xs">{texts.gamesPage.calendarHint}</div>
    </div>
  )
}
