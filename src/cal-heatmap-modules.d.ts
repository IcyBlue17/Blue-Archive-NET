
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
