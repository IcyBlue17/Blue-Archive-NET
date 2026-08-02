import type { ReactNode } from 'react'
import { BuildInfoFooter } from '@/components/layout/buildinfo'

/**
 * 内容区滚动容器。窄屏收窄内边距，把横向空间尽量留给表格与卡片。
 */
export function DashboardMainScroll({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="box-border min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-4">
        <div className="bg-app-base border-app-line rounded-xl border p-4 md:p-6">{children}</div>
        <BuildInfoFooter className="pt-4" />
      </div>
    </div>
  )
}
