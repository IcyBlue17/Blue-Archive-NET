import type { ReactNode } from 'react'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'

export function AdminSection({
  title,
  children,
  className = 'p-4',
  bodyClassName,
}: {
  title: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <LayerCard className={className}>
      <LayerCard.Secondary>{title}</LayerCard.Secondary>
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </LayerCard>
  )
}
