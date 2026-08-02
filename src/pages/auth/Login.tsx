import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Key, Moon, Sun } from '@phosphor-icons/react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Turnstile } from '@marsidev/react-turnstile'
import * as oauthApi from '@/api/oauth'
import * as passkeyApi from '@/api/passkey'
import { setToken } from '@/api/client'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { TURNSTILE_SITE_KEY } from '@/lib/config'
import { qk } from '@/lib/query'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/hooks/useAuth'
import * as userApi from '@/api/user'
import { useAppTexts } from '@/content/texts'
import { Button, Input } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'

export function LoginPage() {
  const texts = useAppTexts()
  const { theme, toggle } = useTheme()
  const { refresh } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstile, setTurnstile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [pkErr, setPkErr] = useState<string | null>(null)
  const [pkPending, setPkPending] = useState(false)

  const providersQuery = useQuery({
    queryKey: qk.oauthProviders,
    queryFn: () => oauthApi.getProviders(),
    staleTime: 60_000,
  })
  const oauthProviders = providersQuery.data ?? []

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await userApi.login({
        email,
        password,
        turnstile: turnstile || 'dev-bypass',
      })
      await refresh()
      nav('/home', { replace: true })
    } catch (err) {

      const msg = err instanceof Error ? err.message : texts.authPages.loginFailed
      setError(msg.replace(/<[^>]*>/g, '').slice(0, 200))
    } finally {
      setPending(false)
    }
  }

  async function onPasskeyLogin() {
    setPkErr(null)
    setPkPending(true)
    try {
      const optionsJSON = await passkeyApi.passkeyLoginOptions()
      const assertion = await startAuthentication({ optionsJSON })
      const { token } = await passkeyApi.passkeyLoginVerify(assertion)
      if (!token) throw new Error(texts.authPages.passkeyNoToken)
      setToken(token)
      await refresh()
      nav('/home', { replace: true })
    } catch (err) {

      const msg = err instanceof Error ? err.message : texts.authPages.passkeyError
      setPkErr(msg.replace(/<[^>]*>/g, '').slice(0, 200))
    } finally {
      setPkPending(false)
    }
  }

  return (
    <SectionCard>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <Text className="text-sm">{texts.authPages.email}</Text>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="flex flex-col gap-1">
          <Text className="text-sm">{texts.authPages.password}</Text>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {TURNSTILE_SITE_KEY ? (
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstile} />
        ) : (
          <Text className="text-sm text-app-warning">
            {texts.authPages.turnstileRequired}
          </Text>
        )}
        {error ? (
          <Text className="text-sm text-app-danger">
            {error}
          </Text>
        ) : null}
        <Button htmlType="submit" type="primary" disabled={pending || (!!TURNSTILE_SITE_KEY && !turnstile)}>
          {texts.authPages.login}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="border-app-line flex-1 border-t" />
        <Text className="text-sm shrink-0 text-app-subtle">
          {texts.authPages.dividerOr}
        </Text>
        <div className="border-app-line flex-1 border-t" />
      </div>
      <OAuthButtons mode="login" enabledProviderIds={oauthProviders} />

      <div className="my-5 flex items-center gap-3">
        <div className="border-app-line flex-1 border-t" />
        <Text className="text-sm shrink-0 text-app-subtle">
          {texts.authPages.dividerOr}
        </Text>
        <div className="border-app-line flex-1 border-t" />
      </div>

      <div>
        {pkErr ? (
          <Text className="text-sm text-app-danger mb-2">
            {pkErr}
          </Text>
        ) : null}
        <Button
          htmlType="button"
          className="w-full gap-2"
          disabled={pkPending}
          onClick={() => void onPasskeyLogin()}
        >
          <Key className="size-5" weight="duotone" aria-hidden />
          {texts.authPages.passkeyLogin}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <RouterLink to="/register" className="text-sm text-app-brand">
          {texts.authPages.register}
        </RouterLink>
        <RouterLink to="/reset-password" className="text-sm text-app-brand">
          {texts.authPages.resetPassword}
        </RouterLink>
        <Button
          htmlType="button"
          type="text"
          size="small"
          aria-label={theme === 'dark' ? texts.authPages.switchLightMode : texts.authPages.switchDarkMode}
          onClick={toggle}
        >
          {theme === 'dark' ? <Sun className="size-5" weight="regular" /> : <Moon className="size-5" weight="regular" />}
        </Button>
      </div>
    </SectionCard>
  )
}
