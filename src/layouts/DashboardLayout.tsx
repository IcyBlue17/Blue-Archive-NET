import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  House,
  Cards,
  GearSix,
  Trophy,
  Images,
  BookOpen,
  ShieldStar,
  Sparkle,
  List,
} from '@phosphor-icons/react'
import { Sidebar, useSidebar } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Switch } from '@cloudflare/kumo/components/switch'
import { Text } from '@cloudflare/kumo/components/text'
import { AppMark } from '../components/common/AppMark'
import { SkeletonBox } from '../components/common/Skeleton'
import { DashboardMainScroll } from '../components/layout/DashboardMainScroll'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../hooks/useAdmin'
import { useI18n } from '../lib/i18n'
import { useTheme } from '../lib/theme'

function NavBtn({
  path,
  icon: Icon,
  children,
  active,
  onNavigate,
}: {
  path: string
  icon: typeof House
  children: React.ReactNode
  active: boolean
  onNavigate: (p: string) => void
}) {
  return (
    <Sidebar.Menu>
      <Sidebar.MenuButton icon={Icon} active={active} onClick={() => onNavigate(path)}>
        {children}
      </Sidebar.MenuButton>
    </Sidebar.Menu>
  )
}

function DashboardShell() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout, loading } = useAuth()
  const { isAdmin } = useAdmin()
  const { isMobile, setOpenMobile } = useSidebar()

  const go = (p: string) => {
    nav(p)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <div className="bg-kumo-background flex h-dvh w-full overflow-hidden">
      <Sidebar className="h-dvh shrink-0 border-r border-kumo-border">
        <Sidebar.Header className="gap-2 p-4">
          <div className="flex items-center gap-2">
            <AppMark />
            <Text variant="heading3" DANGEROUS_className="truncate">
              {t('appName')}
            </Text>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.GroupLabel>{t('dashboard')}</Sidebar.GroupLabel>
            <Sidebar.GroupContent>
              <NavBtn path="/home" icon={House} active={loc.pathname === '/home'} onNavigate={go}>
                {t('home')}
              </NavBtn>
              <NavBtn path="/cards" icon={Cards} active={loc.pathname.startsWith('/cards')} onNavigate={go}>
                {t('cards')}
              </NavBtn>
              <NavBtn path="/setup" icon={BookOpen} active={loc.pathname === '/setup'} onNavigate={go}>
                {t('setup')}
              </NavBtn>
              <NavBtn
                path="/ranking/chu3"
                icon={Trophy}
                active={loc.pathname.startsWith('/ranking')}
                onNavigate={go}
              >
                {t('ranking')}
              </NavBtn>
              <NavBtn path="/games/chu3" icon={Trophy} active={loc.pathname.startsWith('/games')} onNavigate={go}>
                Games
              </NavBtn>
              <NavBtn
                path="/collectibles"
                icon={Sparkle}
                active={loc.pathname === '/collectibles'}
                onNavigate={go}
              >
                {t('collectibles')}
              </NavBtn>
              <NavBtn path="/pictures" icon={Images} active={loc.pathname === '/pictures'} onNavigate={go}>
                {t('pictures')}
              </NavBtn>
              <NavBtn
                path="/settings/profile"
                icon={GearSix}
                active={loc.pathname.startsWith('/settings')}
                onNavigate={go}
              >
                {t('settings')}
              </NavBtn>
              {isAdmin ? (
                <NavBtn path="/admin" icon={ShieldStar} active={loc.pathname.startsWith('/admin')} onNavigate={go}>
                  {t('admin')}
                </NavBtn>
              ) : null}
            </Sidebar.GroupContent>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer className="gap-2 p-4">
          {loading && !user ? (
            <SkeletonBox className="h-4 w-24 rounded-md" />
          ) : (
            <Text size="sm" DANGEROUS_className="text-kumo-subtle truncate">
              {user?.username ?? '—'}
            </Text>
          )}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              >
                {t('language')}
              </Button>
              <Button variant="destructive" size="sm" onClick={logout}>
                {t('logout')}
              </Button>
            </div>
            <Switch
              controlFirst={false}
              size="sm"
              label={locale === 'zh' ? '深色模式' : 'Dark mode'}
              checked={theme === 'dark'}
              onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')}
            />
          </div>
          <div className="hidden md:block">
            <Sidebar.Trigger />
          </div>
        </Sidebar.Footer>
      </Sidebar>
      <DashboardMainScroll>
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <Sidebar.Trigger
            className="shrink-0"
            aria-label={locale === 'zh' ? '打开菜单' : 'Open menu'}
          >
            <List className="size-4" weight="bold" />
          </Sidebar.Trigger>
          <div className="flex min-w-0 items-center gap-2">
            <AppMark />
            <Text size="sm" DANGEROUS_className="truncate">
              {t('appName')}
            </Text>
          </div>
        </div>
        <Outlet />
      </DashboardMainScroll>
    </div>
  )
}

export function DashboardLayout() {
  return (
    <Sidebar.Provider defaultOpen>
      <DashboardShell />
    </Sidebar.Provider>
  )
}
