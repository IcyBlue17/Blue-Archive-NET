import type { ReactNode } from 'react'
import { SectionCard } from '@/components/ui/SectionCard'

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
    <SectionCard title={<>{title}</>} className={className}>
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </SectionCard>
  )
}
