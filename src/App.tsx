import { BrowserRouter, Navigate, Route, Routes as RouterRoutes } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n'
import { queryClient } from '@/lib/query'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AdminGuard } from '@/features/admin/components/AdminGuard'
import { isLoggedIn } from '@/api/client'
import { AuthProvider } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/auth/Login'
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallback'
import { RegisterPage } from '@/pages/auth/Register'
import { ResetPasswordPage } from '@/pages/auth/ResetPassword'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmail'
import { ChangePasswordFromEmailPage } from '@/pages/auth/ChangePasswordFromEmail'
import { HomePage } from '@/pages/dashboard/Home'
import { LinkCardPage } from '@/pages/dashboard/LinkCard'
import { SetupPage } from '@/pages/dashboard/Setup'
import { SupportPage } from '@/pages/dashboard/Support'
import { TransferPage } from '@/pages/dashboard/Transfer'
import { UserProfilePage } from '@/pages/profile/UserProfile'
import { SettingsPage } from '@/pages/profile/Settings'
import { RankingPage } from '@/pages/games/Ranking'
import { GameDashboardPage } from '@/pages/games/GameDashboard'
import { MaiPhotoPage } from '@/pages/games/MaiPhoto'
import { CollectiblesPage } from '@/features/chu3/pages/Collectibles'
import { On9CollectiblesPage } from '@/features/ongeki/pages/On9Collectibles'
import { On9StoryPage } from '@/features/ongeki/pages/On9Story'
import { Chu3FavoritesPage } from '@/features/chu3/pages/Chu3Favorites'
import { Chu3FriendsPage } from '@/features/chu3/pages/Chu3Friends'
import { On9FriendsPage } from '@/features/ongeki/pages/On9Friends'
import { Chu3TeamPage } from '@/features/chu3/pages/Chu3Team'
import { AdminOverviewPage } from '@/features/admin/pages/Overview'
import { AdminUserListPage } from '@/features/admin/pages/UserList'
import { AdminUserDetailPage } from '@/features/admin/pages/UserDetail'
import { AdminLoginBonusPage } from '@/features/admin/pages/LoginBonus'
import { AdminUnlockChallengePage } from '@/features/admin/pages/UnlockChallenge'
import { AdminDownloadOrderPage } from '@/features/admin/pages/DownloadOrder'
import { AdminConfigReloadPage } from '@/features/admin/pages/ConfigReload'
import { AdminOngekiRankingPage } from '@/features/admin/pages/OngekiRanking'
import { AdminChusanRankingPage } from '@/features/admin/pages/ChusanRanking'
import { AdminAllNetTitleTlsPage } from '@/features/admin/pages/AllNetTitleTls'
import { AdminOngekiEventsPage } from '@/features/admin/pages/OngekiEvents'
import { PageNotFound } from '@/pages/PageNotFound'

// 包一层后，事务名会是 /u/:username 这种参数化路由，而不是每个用户名各算一条
const Routes = Sentry.wrapReactRouterRouting(RouterRoutes)

function RootRedirect() {
  return <Navigate to={isLoggedIn() ? '/home' : '/login'} replace />
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
                <div className="min-h-dvh w-full">
                  <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/verify" element={<VerifyEmailPage />} />
                    <Route path="/change-password" element={<ChangePasswordFromEmailPage />} />
                  </Route>
                  <Route path="/u/:username" element={<UserProfilePage />} />
                  <Route path="/u/:username/:game" element={<UserProfilePage />} />
                  <Route element={<RequireAuth />}>
                    <Route element={<DashboardLayout />}>
                      <Route path="/home" element={<HomePage />} />
                      <Route path="/cards" element={<LinkCardPage />} />
                      <Route path="/setup" element={<SetupPage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/transfer" element={<TransferPage />} />
                      <Route path="/collectibles" element={<CollectiblesPage />} />
                      <Route path="/collectibles/ongeki" element={<On9CollectiblesPage />} />
                      <Route path="/on9-story" element={<On9StoryPage />} />
                      <Route path="/pictures" element={<MaiPhotoPage />} />
                      <Route path="/ranking" element={<Navigate to="/ranking/chu3" replace />} />
                      <Route path="/ranking/:game" element={<RankingPage />} />
                      <Route path="/games" element={<Navigate to="/games/chu3" replace />} />
                      <Route path="/games/:game" element={<GameDashboardPage />} />
                      <Route path="/games/:game/:section" element={<GameDashboardPage />} />
                      <Route path="/team" element={<Chu3TeamPage />} />
                      <Route path="/favorites" element={<Chu3FavoritesPage />} />
                      <Route path="/friends" element={<Chu3FriendsPage />} />
                      <Route path="/friends/ongeki" element={<On9FriendsPage />} />
                      <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
                      <Route path="/settings/:page" element={<SettingsPage />} />
                      <Route path="/admin" element={<AdminGuard />}>
                        <Route element={<AdminLayout />}>
                          <Route index element={<AdminOverviewPage />} />
                          <Route path="users" element={<AdminUserListPage />} />
                          <Route path="users/:id" element={<AdminUserDetailPage />} />
                          <Route path="login-bonus" element={<AdminLoginBonusPage />} />
                          <Route path="unlock-challenge" element={<AdminUnlockChallengePage />} />
                          <Route path="download-order" element={<AdminDownloadOrderPage />} />
                          <Route path="config-reload" element={<AdminConfigReloadPage />} />
                          <Route path="ongeki-ranking" element={<AdminOngekiRankingPage />} />
                          <Route path="chusan-ranking" element={<AdminChusanRankingPage />} />
                          <Route path="allnet-title-tls" element={<AdminAllNetTitleTlsPage />} />
                          <Route path="ongeki-events" element={<AdminOngekiEventsPage />} />
                        </Route>
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<PageNotFound />} />
                  </Routes>
                </div>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
