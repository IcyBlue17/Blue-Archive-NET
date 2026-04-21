import { Breadcrumbs } from '@cloudflare/kumo/components/breadcrumbs'
import { Text } from '@cloudflare/kumo/components/text'
import { Fragment } from 'react'

export type Crumb = { label: string; href?: string }

export function PageHeader({ title, crumbs }: { title: string; crumbs: Crumb[] }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <Breadcrumbs size="sm">
        {crumbs.map((c, i) => (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 ? <Breadcrumbs.Separator /> : null}
            {c.href ? <Breadcrumbs.Link href={c.href}>{c.label}</Breadcrumbs.Link> : null}
          </Fragment>
        ))}
        {crumbs.length > 0 ? <Breadcrumbs.Separator /> : null}
        <Breadcrumbs.Current>{title}</Breadcrumbs.Current>
      </Breadcrumbs>
      <Text variant="heading2">{title}</Text>
    </div>
  )
}
