import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toasty } from '@cloudflare/kumo'
import { ThemeProvider } from './lib/theme'
import { I18nProvider } from './lib/i18n'
import { queryClient } from './lib/query'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { RequireAuth } from './components/auth/RequireAuth'
import { AdminGuard } from './components/admin/AdminGuard'
import { isLoggedIn } from './api/client'
import { AuthProvider } from './hooks/useAuth'
import { LoginPage } from './pages/auth/Login'
import { RegisterPage } from './pages/auth/Register'
import { ResetPasswordPage } from './pages/auth/ResetPassword'
import { VerifyEmailPage } from './pages/auth/VerifyEmail'
import { ChangePasswordFromEmailPage } from './pages/auth/ChangePasswordFromEmail'
import { HomePage } from './pages/dashboard/Home'
import { LinkCardPage } from './pages/dashboard/LinkCard'
import { SetupPage } from './pages/dashboard/Setup'
import { SupportPage } from './pages/dashboard/Support'
import { TransferPage } from './pages/dashboard/Transfer'
import { UserProfilePage } from './pages/profile/UserProfile'
import { SettingsPage } from './pages/profile/Settings'
import { RankingPage } from './pages/games/Ranking'
import { GameDashboardPage } from './pages/games/GameDashboard'
import { MaiPhotoPage } from './pages/games/MaiPhoto'
import { CollectiblesPage } from './pages/dashboard/Collectibles'
import { AdminOverviewPage } from './pages/admin/Overview'
import { AdminUserListPage } from './pages/admin/UserList'
import { AdminUserDetailPage } from './pages/admin/UserDetail'
import { AdminLoginBonusPage } from './pages/admin/LoginBonus'
import { AdminUnlockChallengePage } from './pages/admin/UnlockChallenge'
import { PageNotFound } from './pages/PageNotFound'

function RootRedirect() {
  return <Navigate to={isLoggedIn() ? '/home' : '/login'} replace />
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Toasty>
              <BrowserRouter>
                <div className="min-h-dvh w-full">
                  <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
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
                      <Route path="/pictures" element={<MaiPhotoPage />} />
                      <Route path="/ranking" element={<Navigate to="/ranking/chu3" replace />} />
                      <Route path="/ranking/:game" element={<RankingPage />} />
                      <Route path="/games" element={<Navigate to="/games/chu3" replace />} />
                      <Route path="/games/:game" element={<GameDashboardPage />} />
                      <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
                      <Route path="/settings/:page" element={<SettingsPage />} />
                      <Route path="/admin" element={<AdminGuard />}>
                        <Route element={<AdminLayout />}>
                          <Route index element={<AdminOverviewPage />} />
                          <Route path="users" element={<AdminUserListPage />} />
                          <Route path="users/:id" element={<AdminUserDetailPage />} />
                          <Route path="login-bonus" element={<AdminLoginBonusPage />} />
                          <Route path="unlock-challenge" element={<AdminUnlockChallengePage />} />
                        </Route>
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<PageNotFound />} />
                  </Routes>
                </div>
              </BrowserRouter>
            </Toasty>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
