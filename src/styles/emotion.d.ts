import '@emotion/react'
import type { GlobalToken } from 'antd'

declare module '@emotion/react' {
  /**
   * Emotion 的 theme 就是 antd 的 design token，外加一个当前模式。
   * 这样 css-in-js 里写 `({ theme }) => theme.colorBorderSecondary` 拿到的
   * 和组件、和 Tailwind 的 --app-* 是同一套值。
   */
  export interface Theme extends GlobalToken {
    mode: 'light' | 'dark'
  }
}
