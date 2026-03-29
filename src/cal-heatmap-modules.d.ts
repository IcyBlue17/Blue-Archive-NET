/** cal-heatmap 的 package exports 未指向 typings，由本地声明补齐。 */
declare module 'cal-heatmap' {
  export default class CalHeatmap {
    addTemplates(templates: unknown): void
    paint(options?: unknown, plugins?: unknown): Promise<unknown>
    destroy(): Promise<unknown>
  }
}

declare module 'cal-heatmap/plugins/Tooltip' {
  const CalTooltip: unknown
  export default CalTooltip
}
