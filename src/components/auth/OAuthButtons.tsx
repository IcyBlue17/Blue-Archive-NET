import { AppleLogo, GithubLogo, GoogleLogo, WindowsLogo } from '@phosphor-icons/react'
import { Text } from '@cloudflare/kumo/components/text'
import { OAUTH_API_ORIGIN } from '../../lib/config'
import { useI18n } from '../../lib/i18n'

const BIND_COOKIE = 'bind_token'
const BIND_MAX_AGE = 300

/** Fixed order to match Spring registration ids + product expectation (like reference UI). */
export const OAUTH_PROVIDER_ORDER = ['google', 'microsoft', 'github', 'apple'] as const
export type OauthProviderId = (typeof OAUTH_PROVIDER_ORDER)[number]

function setBindTokenCookie(value: string) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${BIND_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${BIND_MAX_AGE}; SameSite=Lax${secure}`
}

function providerDisplayName(provider: string, locale: 'zh' | 'en'): string {
  const p = provider.toLowerCase()
  if (locale === 'zh') {
    if (p === 'google') return 'Google'
    if (p === 'microsoft') return 'Microsoft'
    if (p === 'github') return 'GitHub'
    if (p === 'apple') return 'Apple'
  }
  if (p === 'google') return 'Google'
  if (p === 'microsoft') return 'Microsoft'
  if (p === 'github') return 'GitHub'
  if (p === 'apple') return 'Apple'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function ProviderMark({ id }: { id: string }) {
  const p = id.toLowerCase()
  const wrap =
    'flex size-10 shrink-0 items-center justify-center rounded-lg border border-kumo-border bg-kumo-background'
  if (p === 'google') {
    return (
      <span className={wrap} aria-hidden>
        <GoogleLogo className="size-6 text-[#EA4335]" weight="fill" />
      </span>
    )
  }
  if (p === 'microsoft') {
    return (
      <span className={wrap} aria-hidden>
        <WindowsLogo className="size-6 text-[#00A4EF]" weight="fill" />
      </span>
    )
  }
  if (p === 'github') {
    return (
      <span className={wrap} aria-hidden>
        <GithubLogo className="size-6 text-kumo-text" weight="fill" />
      </span>
    )
  }
  if (p === 'apple') {
    return (
      <span className={wrap} aria-hidden>
        <AppleLogo className="size-6 text-kumo-text" weight="fill" />
      </span>
    )
  }
  return <span className={wrap} aria-hidden />
}

export type OAuthButtonsProps = {
  mode: 'login' | 'bind'
  /** Providers the server has enabled (non-empty client-id). */
  enabledProviderIds: string[]
  /** In bind mode: omit buttons for these (already linked). */
  excludeProviderIds?: string[]
  getToken?: () => string | Promise<string>
  disabled?: boolean
}

export function OAuthButtons({
  mode,
  enabledProviderIds,
  excludeProviderIds = [],
  getToken,
  disabled,
}: OAuthButtonsProps) {
  const { t, locale } = useI18n()
  const enabled = new Set(enabledProviderIds.map((x) => x.toLowerCase()))
  const excluded = new Set(excludeProviderIds.map((x) => x.toLowerCase()))
  const loc = locale === 'en' ? 'en' : 'zh'

  async function go(provider: string) {
    const origin = OAUTH_API_ORIGIN().replace(/\/$/, '')
    const url = `${origin}/oauth2/authorization/${encodeURIComponent(provider)}`
    if (mode === 'bind') {
      const tokenFn = getToken
      if (!tokenFn) return
      const tok = await Promise.resolve(tokenFn())
      if (!tok) return
      setBindTokenCookie(tok)
    }
    window.location.assign(url)
  }

  return (
    <div className="flex flex-col gap-2.5">
      {OAUTH_PROVIDER_ORDER.map((id) => {
        if (excluded.has(id)) return null
        const isOn = enabled.has(id)
        const name = providerDisplayName(id, loc)
        const label = t('auth.oauthContinue').replace('{name}', name)
        const bindBlocked = mode === 'bind' && !getToken
        const hint =
          !isOn ? t('auth.oauthNotConfiguredHint') : bindBlocked ? t('auth.oauthBindNeedToken') : undefined
        return (
          <button
            key={id}
            type="button"
            disabled={disabled || bindBlocked || !isOn}
            title={hint}
            onClick={() => {
              if (!isOn || bindBlocked || disabled) return
              void go(id)
            }}
            className={
              'border-kumo-border bg-kumo-background text-kumo-text flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ' +
              (isOn && !disabled && !bindBlocked
                ? 'hover:bg-kumo-muted/40 cursor-pointer'
                : 'cursor-not-allowed opacity-55')
            }
          >
            <ProviderMark id={id} />
            <Text size="sm" DANGEROUS_className="min-w-0 flex-1 font-medium">
              {label}
            </Text>
          </button>
        )
      })}
    </div>
  )
}
