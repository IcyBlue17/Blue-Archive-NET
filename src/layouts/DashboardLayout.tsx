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
  IdentificationCard,
  List,
  UsersThree,
} from '@phosphor-icons/react'
import { Sidebar, useSidebar } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Switch } from '@cloudflare/kumo/components/switch'
import { Text } from '@cloudflare/kumo/components/text'
import { BrandImage } from '../components/common/BrandImage'
import { SkeletonBox } from '../components/common/Skeleton'
import { DashboardMainScroll } from '../components/layout/DashboardMainScroll'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../hooks/useAdmin'
import { useI18n } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { useAppTexts } from '../content/texts'
import { APP_NAME } from '../lib/config'

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
  const { locale, setLocale } = useI18n()
  const texts = useAppTexts()
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
    <div className="bg-kumo-surface flex h-dvh w-full overflow-hidden">
      <Sidebar className="h-dvh shrink-0 border-r border-kumo-line">
        <Sidebar.Header className="gap-2 p-4">
          <div className="flex items-center gap-2">
            <BrandImage kind="mark" />
            <Text variant="heading3" DANGEROUS_className="truncate">
              {APP_NAME}
            </Text>
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.GroupLabel>{texts.nav.dashboard}</Sidebar.GroupLabel>
            <Sidebar.GroupContent>
              <NavBtn path="/home" icon={House} active={loc.pathname === '/home'} onNavigate={go}>
                {texts.nav.home}
              </NavBtn>
              <NavBtn path="/cards" icon={Cards} active={loc.pathname.startsWith('/cards')} onNavigate={go}>
                {texts.nav.cards}
              </NavBtn>
              <NavBtn path="/setup" icon={BookOpen} active={loc.pathname === '/setup'} onNavigate={go}>
                {texts.nav.setup}
              </NavBtn>
              <NavBtn
                path="/ranking/chu3"
                icon={Trophy}
                active={loc.pathname.startsWith('/ranking')}
                onNavigate={go}
              >
                {texts.nav.ranking}
              </NavBtn>
              <NavBtn path="/games/chu3" icon={Trophy} active={loc.pathname.startsWith('/games')} onNavigate={go}>
                {texts.layout.games}
              </NavBtn>
              <NavBtn path="/team" icon={ShieldStar} active={loc.pathname.startsWith('/team')} onNavigate={go}>
                {texts.nav.team}
              </NavBtn>
              <NavBtn path="/friends" icon={UsersThree} active={loc.pathname.startsWith('/friends')} onNavigate={go}>
                {texts.nav.friends}
              </NavBtn>
              <NavBtn
                path="/collectibles"
                icon={Sparkle}
                active={loc.pathname === '/collectibles'}
                onNavigate={go}
              >
                {texts.nav.collectibles}
              </NavBtn>
              <NavBtn
                path="/collectibles/ongeki"
                icon={IdentificationCard}
                active={loc.pathname === '/collectibles/ongeki'}
                onNavigate={go}
              >
                {texts.nav.on9Collectibles}
              </NavBtn>
              <NavBtn path="/pictures" icon={Images} active={loc.pathname === '/pictures'} onNavigate={go}>
                {texts.nav.pictures}
              </NavBtn>
              <NavBtn
                path="/settings/profile"
                icon={GearSix}
                active={loc.pathname.startsWith('/settings')}
                onNavigate={go}
              >
                {texts.nav.settings}
              </NavBtn>
              {isAdmin ? (
                <NavBtn path="/admin" icon={ShieldStar} active={loc.pathname.startsWith('/admin')} onNavigate={go}>
                  {texts.nav.admin}
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
                {texts.nav.language}
              </Button>
              <Button variant="destructive" size="sm" onClick={logout}>
                {texts.nav.logout}
              </Button>
            </div>
            <Switch
              controlFirst={false}
              size="sm"
              label={texts.layout.darkMode}
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
            aria-label={texts.layout.openMenu}
          >
            <List className="size-4" weight="bold" />
          </Sidebar.Trigger>
          <div className="flex min-w-0 items-center gap-2">
            <BrandImage kind="mark" />
            <Text size="sm" DANGEROUS_className="truncate">
              {APP_NAME}
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
