import { Breadcrumb, Typography } from 'antd'
import { Link } from 'react-router-dom'

export type Crumb = { label: string; href?: string }

/**
 * 面包屑用 react-router 的 Link 而不是裸 href——原来的实现会整页刷新，
 * 在 SPA 里等于把已缓存的 query 全丢了。
 */
export function PageHeader({ title, crumbs }: { title: string; crumbs: Crumb[] }) {
  const items = [
    ...crumbs.map((c) => ({
      key: `${c.label}-${c.href ?? ''}`,
      title: c.href ? <Link to={c.href}>{c.label}</Link> : c.label,
    })),
    { key: '__current', title },
  ]

  return (
    <div className="mb-6 flex flex-col gap-2">
      <Breadcrumb items={items} />
      <Typography.Title level={3} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
    </div>
  )
}
