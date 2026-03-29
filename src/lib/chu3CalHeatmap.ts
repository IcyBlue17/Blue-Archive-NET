import moment from 'moment'
import CalHeatmap from 'cal-heatmap'
import CalTooltip from 'cal-heatmap/plugins/Tooltip'
import 'cal-heatmap/cal-heatmap.css'

type TrendPoint = { date: string; value: number }

/** 与 aquaNet `ui.ts` `dayTemplate` / `renderCal` 一致 */
function dayTemplate(DateHelper: any, _options?: unknown) {
  const ROWS_COUNT = 7
  const ALLOWED_DOMAIN_TYPE = ['month']

  return {
    name: 'ghDayFix',
    allowedDomainType: ALLOWED_DOMAIN_TYPE,
    rowsCount: () => ROWS_COUNT,
    columnsCount: (ts: unknown) => {
      let count = DateHelper.getWeeksCountInMonth(ts)
      const endOfMonth = moment().endOf('month').toDate()
      const clampEnd = DateHelper.getFirstWeekOfMonth(endOfMonth).toDate()

      if (moment(ts as Date).isSame(new Date(), 'month') && endOfMonth > clampEnd) {
        count++
      }
      return count
    },
    mapping: (startTimestamp: unknown, endTimestamp: unknown) => {
      const clampStart = DateHelper.getFirstWeekOfMonth(startTimestamp)
      let clampEnd = DateHelper.getFirstWeekOfMonth(endTimestamp)

      if (moment(startTimestamp as Date).isSame(new Date(), 'month')) {
        clampEnd = DateHelper.date().add(1, 'day')
      }

      let x = -1
      const pivotDay = clampStart.weekday()

      return DateHelper.intervals('day', clampStart, clampEnd).map((ts: unknown) => {
        const weekday = DateHelper.date(ts).weekday()
        if (weekday === pivotDay) {
          x += 1
        }

        return {
          t: ts,
          x,
          y: weekday,
        }
      })
    },
    extractUnit: (ts: unknown) => DateHelper.date(ts).startOf('day').valueOf(),
  }
}

export async function paintChu3CalHeatmap(
  el: HTMLElement,
  trend: TrendPoint[],
): Promise<InstanceType<typeof CalHeatmap>> {
  const maxRaw = Math.max(0, ...trend.map((x) => x.value))
  /** 单日最高局数较少时仍拉开色阶，避免几乎全是最浅色 */
  const maxV = Math.max(1, maxRaw < 8 ? 8 : maxRaw)
  const cal = new CalHeatmap()
  cal.addTemplates(dayTemplate)
  await cal.paint(
    {
      itemSelector: el,
      domain: {
        type: 'month',
        label: { text: 'MMM', textAlign: 'start', position: 'top' },
      },
      subDomain: {
        type: 'ghDayFix',
        radius: 2,
        width: 12,
        height: 12,
        gutter: 4,
      },
      range: 12,
      data: { source: trend.filter((x) => x.value > 0), x: 'date', y: 'value' },
      scale: {
        color: {
          type: 'linear',
          /** 浅色页面上更易分辨：浅绿底 → 翠绿 → 深绿（仍保持「贡献图」语义） */
          range: ['#d8f5e0', '#22c55e', '#14532d'],
          domain: [0, maxV],
        },
      },
      date: { start: moment().subtract(1, 'year').add(1, 'month').toDate() },
      theme: 'light',
    },
    [
      [
        CalTooltip,
        {
          text: (_: Date, v: number, d: { format: (s: string) => string }) =>
            `${v ?? 'No'} 局 · ${d.format('YYYY-MM-DD')}`,
        },
      ],
    ],
  )
  return cal
}
