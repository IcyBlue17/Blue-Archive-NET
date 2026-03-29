import type { ReactNode } from 'react'
import { Surface } from '@cloudflare/kumo/components/surface'

/**
 * 主内容区单独滚动：避免长页面把左侧 Sidebar 撑高。
 * 父级需为 `flex h-dvh overflow-hidden`，本组件为 `flex-1 min-h-0`。
 */
export function DashboardMainScroll({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="box-border min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        <Surface className="p-6">{children}</Surface>
      </div>
    </div>
  )
}
