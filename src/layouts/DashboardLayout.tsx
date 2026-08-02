import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  House,
  Cards,
  GearSix,
  Trophy,
  Images,
  BookOpen,
  Heart,
  ShieldStar,
  Sparkle,
  IdentificationCard,
  List,
  CaretLeft,
  CaretRight,
  Scroll,
  UsersThree,
} from '@phosphor-icons/react'
import { Button, Drawer, Grid, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { BrandImage } from '@/components/common/BrandImage'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { LabeledSwitch } from '@/components/ui/LabeledSwitch'
import { DashboardMainScroll } from '@/components/layout/DashboardMainScroll'
import { useAuth } from '@/hooks/useAuth'
import { useAdmin } from '@/hooks/useAdmin'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { useAppTexts } from '@/content/texts'
import { APP_NAME } from '@/lib/config'
import { Text } from '@/components/ui/Text'

type NavEntry = {
  /** Menu 的 key，同时也是点击后跳转的目标。 */
  key: string
  icon: typeof House
  label: string
  /** 当前路径是否算命中这一项。 */
  match: (pathname: string) => boolean
  adminOnly?: boolean
}

type NavGroup = { label: string; entries: NavEntry[] }

const exact = (p: string) => (path: string) => path === p
const prefix = (p: string) => (path: string) => path.startsWith(p)

function useNavGroups(): NavGroup[] {
  const texts = useAppTexts()
  const { isAdmin } = useAdmin()

  return useMemo(() => {
    const groups: NavGroup[] = [
      {
        label: texts.nav.groups.basic,
        entries: [
          { key: '/home', icon: House, label: texts.nav.home, match: exact('/home') },
          { key: '/cards', icon: Cards, label: texts.nav.cards, match: prefix('/cards') },
          { key: '/setup', icon: BookOpen, label: texts.nav.setup, match: exact('/setup') },
          { key: '/ranking/chu3', icon: Trophy, label: texts.nav.ranking, match: prefix('/ranking') },
          { key: '/games/chu3', icon: Trophy, label: texts.layout.games, match: prefix('/games') },
          { key: '/settings/profile', icon: GearSix, label: texts.nav.settings, match: prefix('/settings') },
          { key: '/admin', icon: ShieldStar, label: texts.nav.admin, match: prefix('/admin'), adminOnly: true },
        ],
      },
      {
        label: texts.nav.groups.maimai,
        entries: [{ key: '/pictures', icon: Images, label: texts.nav.pictures, match: exact('/pictures') }],
      },
      {
        label: texts.nav.groups.chunithm,
        entries: [
          { key: '/collectibles', icon: Sparkle, label: texts.nav.collectibles, match: exact('/collectibles') },
          { key: '/favorites', icon: Heart, label: texts.nav.chu3Favorites, match: exact('/favorites') },
          { key: '/team', icon: ShieldStar, label: texts.nav.team, match: prefix('/team') },
          { key: '/friends', icon: UsersThree, label: texts.nav.friends, match: exact('/friends') },
        ],
      },
      {
        label: texts.nav.groups.ongeki,
        entries: [
          {
            key: '/collectibles/ongeki',
            icon: IdentificationCard,
            label: texts.nav.on9Collectibles,
            match: exact('/collectibles/ongeki'),
          },
          { key: '/on9-story', icon: Scroll, label: texts.nav.on9Story, match: exact('/on9-story') },
          { key: '/friends/ongeki', icon: UsersThree, label: texts.nav.on9Friends, match: exact('/friends/ongeki') },
        ],
      },
    ]
    return groups
      .map((g) => ({ ...g, entries: g.entries.filter((e) => !e.adminOnly || isAdmin) }))
      .filter((g) => g.entries.length > 0)
  }, [texts, isAdmin])
}

function toMenuItems(groups: NavGroup[]): MenuProps['items'] {
  return groups.map((g) => ({
    type: 'group' as const,
    key: g.label,
    label: g.label,
    children: g.entries.map((e) => ({
      key: e.key,
      icon: <e.icon className="size-4" weight="duotone" />,
      label: e.label,
    })),
  }))
}

/**
 * 选中项。`/collectibles/ongeki` 这类更具体的路径要先于 `/collectibles` 判定，
 * 所以按「精确匹配优先于前缀匹配」来挑。
 */
function selectedKey(groups: NavGroup[], pathname: string): string[] {
  const all = groups.flatMap((g) => g.entries)
  const hit = all.find((e) => e.key === pathname) ?? all.find((e) => e.match(pathname))
  return hit ? [hit.key] : []
}

function SidebarFooter({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
}) {
  const { locale, setLocale } = useI18n()
  const texts = useAppTexts()
  const { theme, setTheme } = useTheme()
  const { user, logout, loading } = useAuth()

  // 收起时只留一个展开按钮，其余控件没地方摆
  if (collapsed) {
    return (
      <div className="border-app-line flex justify-center border-t p-2">
        <Button
          type="text"
          size="small"
          aria-label={texts.layout.openMenu}
          onClick={onToggleCollapse}
          icon={<CaretRight className="size-4" weight="bold" />}
        />
      </div>
    )
  }

  return (
    <div className="border-app-line flex flex-col gap-3 border-t px-4 py-3">
      {loading && !user ? (
        <SkeletonBox className="h-4 w-24 rounded-md" />
      ) : (
        <Text className="text-app-subtle truncate text-sm">{user?.username ?? '—'}</Text>
      )}
      <LabeledSwitch
        size="small"
        label={texts.layout.darkMode}
        checked={theme === 'dark'}
        onChange={(on) => setTheme(on ? 'dark' : 'light')}
      />
      {/* 语言 / 退出 / 收起挤在一行，省掉两行高度 */}
      <div className="flex items-center gap-1">
        <Button size="small" type="text" onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}>
          {texts.nav.language}
        </Button>
        <Button danger size="small" type="text" onClick={logout}>
          {texts.nav.logout}
        </Button>
        {onToggleCollapse ? (
          <Button
            type="text"
            size="small"
            className="ml-auto"
            aria-label={texts.layout.collapseMenu}
            onClick={onToggleCollapse}
            icon={<CaretLeft className="size-4" weight="bold" />}
          />
        ) : null}
      </div>
    </div>
  )
}

function SidebarBrand() {
  return (
    <div className="border-app-line flex h-14 items-center gap-2 border-b px-4">
      <BrandImage kind="mark" />
      <Text className="truncate font-semibold">{APP_NAME}</Text>
    </div>
  )
}

export function DashboardLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const texts = useAppTexts()
  const screens = Grid.useBreakpoint()
  // useBreakpoint 首帧可能返回空对象，此时按桌面处理，避免抽屉一闪而过
  const isMobile = screens.md === false
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const groups = useNavGroups()
  const items = useMemo(() => toMenuItems(groups), [groups])
  const selected = selectedKey(groups, loc.pathname)

  const onSelect: MenuProps['onClick'] = (info) => {
    nav(info.key)
    setDrawerOpen(false)
  }

  // 行高 / 行距一律走 antd Menu 的默认值，不做压缩
  const menu = (
    <Menu mode="inline" items={items} selectedKeys={selected} onClick={onSelect} style={{ borderInlineEnd: 'none' }} />
  )

  return (
    <Layout className="bg-app-surface h-dvh w-full overflow-hidden">
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          size={260}
          closable={false}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        >
          <SidebarBrand />
          <div className="min-h-0 flex-1 overflow-y-auto">{menu}</div>
          <SidebarFooter collapsed={false} />
        </Drawer>
      ) : (
        <Layout.Sider
          className="bg-app-base border-app-line h-dvh border-r"
          width={200}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          // 默认触发条是一根深色横杠，跟主题完全不搭；关掉它，折叠入口放进页脚自己画
          trigger={null}
        >
          <div className="flex h-full flex-col">
            <SidebarBrand />
            <div className="min-h-0 flex-1 overflow-y-auto">{menu}</div>
            <SidebarFooter collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
          </div>
        </Layout.Sider>
      )}

      <DashboardMainScroll>
        {isMobile ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            <Button
              type="text"
              aria-label={texts.layout.openMenu}
              onClick={() => setDrawerOpen(true)}
              icon={<List className="size-4" weight="bold" />}
            />
            <div className="flex min-w-0 items-center gap-2">
              <BrandImage kind="mark" />
              <Text className="truncate text-sm">{APP_NAME}</Text>
            </div>
          </div>
        ) : null}
        <Outlet />
      </DashboardMainScroll>
    </Layout>
  )
}
