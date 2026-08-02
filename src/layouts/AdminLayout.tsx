import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAppTexts } from '@/content/texts'
import { Tabs } from 'antd'

const ADMIN_TABS = [
  { path: '/admin', value: 'overview', labelKey: 'overview' },
  { path: '/admin/users', value: 'users', labelKey: 'users' },
  { path: '/admin/login-bonus', value: 'login-bonus', labelKey: 'loginBonus' },
  { path: '/admin/unlock-challenge', value: 'unlock', labelKey: 'unlock' },
  { path: '/admin/download-order', value: 'download-order', labelKey: 'downloadOrder' },
  { path: '/admin/config-reload', value: 'config-reload', labelKey: 'configReload' },
  { path: '/admin/ongeki-ranking', value: 'ongeki-ranking', labelKey: 'ongekiRanking' },
  { path: '/admin/chusan-ranking', value: 'chusan-ranking', labelKey: 'chusanRanking' },
  { path: '/admin/allnet-title-tls', value: 'allnet-title-tls', labelKey: 'allnetTitleTls' },
  { path: '/admin/ongeki-events', value: 'ongeki-events', labelKey: 'ongekiEvents' },
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
    if (loc.pathname.startsWith('/admin/config-reload')) return 'config-reload'
    if (loc.pathname.startsWith('/admin/ongeki-ranking')) return 'ongeki-ranking'
    if (loc.pathname.startsWith('/admin/chusan-ranking')) return 'chusan-ranking'
    if (loc.pathname.startsWith('/admin/allnet-title-tls')) return 'allnet-title-tls'
    if (loc.pathname.startsWith('/admin/ongeki-events')) return 'ongeki-events'
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
      {/*
        原来这里是 Segmented 风格的标签条 + 下面一整行重复的 NavLink。九个入口在手机上
        两种都会挤爆，所以合并成一条 antd Tabs——它自带溢出滚动与左右箭头。
      */}
      <Tabs
        className="mb-6"
        items={ADMIN_TABS.map((x) => ({ key: x.value, label: texts.admin.tabs[x.labelKey] }))}
        activeKey={active}
        onChange={(v) => {
          const item = ADMIN_TABS.find((x) => x.value === v)
          if (item) nav(item.path)
        }}
      />
      <Outlet />
    </div>
  )
}
