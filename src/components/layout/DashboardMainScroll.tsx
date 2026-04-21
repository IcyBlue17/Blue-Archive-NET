import type { ReactNode } from 'react'
import { Surface } from '@cloudflare/kumo/components/surface'

export function DashboardMainScroll({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="box-border min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        <Surface className="p-6">{children}</Surface>
      </div>
    </div>
  )
}
