import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { PageHeader } from '../components/common/PageHeader'
import { useAppTexts } from '../content/texts'

const ADMIN_TABS = [
  { path: '/admin', value: 'overview', labelKey: 'overview' },
  { path: '/admin/users', value: 'users', labelKey: 'users' },
  { path: '/admin/login-bonus', value: 'login-bonus', labelKey: 'loginBonus' },
  { path: '/admin/unlock-challenge', value: 'unlock', labelKey: 'unlock' },
  { path: '/admin/download-order', value: 'download-order', labelKey: 'downloadOrder' },
] as const

export function AdminLayout() {
  const texts = useAppTexts()
  const loc = useLocation()
  const nav = useNavigate()

  const active = useMemo(() => {
    if (loc.pathname.startsWith('/admin/users')) return 'users'
    if (loc.pathname.startsWith('/admin/login-bonus')) return 'login-bonus'
    if (loc.pathname.startsWith('/admin/unlock-challenge')) return 'unlock'
    if (loc.pathname.startsWith('/admin/download-order')) return 'download-order'
    return 'overview'
  }, [loc.pathname])

  return (
    <div>
      <PageHeader
        title={texts.nav.admin}
        crumbs={[
          { label: texts.nav.home, href: '/home' },
          { label: texts.nav.admin, href: '/admin' },
        ]}
      />
      <Tabs
        className="mb-6"
        variant="segmented"
        tabs={ADMIN_TABS.map((x) => ({ value: x.value, label: texts.admin.tabs[x.labelKey] }))}
        value={active}
        onValueChange={(v) => {
          const item = ADMIN_TABS.find((x) => x.value === v)
          if (item) nav(item.path)
        }}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {ADMIN_TABS.map((x) => (
          <NavLink
            key={x.path}
            to={x.path}
            className={({ isActive }) =>
              `rounded-md px-3 py-1 text-sm no-underline ${isActive ? 'bg-kumo-fill text-kumo-strong' : 'text-kumo-subtle'}`
            }
          >
            {texts.admin.tabs[x.labelKey]}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
