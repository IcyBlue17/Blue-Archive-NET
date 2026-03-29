import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { PageHeader } from '../components/common/PageHeader'
import { useI18n } from '../lib/i18n'

const ADMIN_TABS = [
  { path: '/admin', value: 'overview', label: '概览' },
  { path: '/admin/users', value: 'users', label: '用户' },
  { path: '/admin/login-bonus', value: 'login-bonus', label: '登录奖励' },
  { path: '/admin/unlock-challenge', value: 'unlock', label: '解锁挑战' },
] as const

export function AdminLayout() {
  const { t } = useI18n()
  const loc = useLocation()
  const nav = useNavigate()

  const active = useMemo(() => {
    if (loc.pathname.startsWith('/admin/users')) return 'users'
    if (loc.pathname.startsWith('/admin/login-bonus')) return 'login-bonus'
    if (loc.pathname.startsWith('/admin/unlock-challenge')) return 'unlock'
    return 'overview'
  }, [loc.pathname])

  return (
    <div>
      <PageHeader
        title={t('admin')}
        crumbs={[
          { label: t('home'), href: '/home' },
          { label: t('admin'), href: '/admin' },
        ]}
      />
      <Tabs
        className="mb-6"
        variant="segmented"
        tabs={ADMIN_TABS.map((x) => ({ value: x.value, label: x.label }))}
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
            {x.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
