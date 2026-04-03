import type { ComponentType, SVGProps } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import { OAUTH_API_ORIGIN } from '../../lib/config'
import { useI18n } from '../../lib/i18n'
// @ts-expect-error virtual icon from local unplugin-icons
import AppleLogo from '~icons/logos/apple'
// @ts-expect-error virtual icon from local unplugin-icons
import GithubLogo from '~icons/simple-icons/github'
// @ts-expect-error virtual icon from local unplugin-icons
import GoogleLogo from '~icons/logos/google-icon'
// @ts-expect-error virtual icon from local unplugin-icons
import MicrosoftLogo from '~icons/logos/microsoft-icon'

const BIND_COOKIE = 'bind_token'
const BIND_MAX_AGE = 300

/** Fixed order to match Spring registration ids + product expectation (like reference UI). */
export const OAUTH_PROVIDER_ORDER = ['google', 'microsoft', 'github', 'apple'] as const
export type OauthProviderId = (typeof OAUTH_PROVIDER_ORDER)[number]

const PROVIDER_DISPLAY_NAME: Record<OauthProviderId, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  github: 'GitHub',
  apple: 'Apple',
}

type OauthIcon = ComponentType<SVGProps<SVGSVGElement>>

const PROVIDER_ICON: Record<OauthProviderId, OauthIcon> = {
  google: GoogleLogo,
  microsoft: MicrosoftLogo,
  github: GithubLogo,
  apple: AppleLogo,
}

const PROVIDER_ICON_CLASS: Record<OauthProviderId, string> = {
  google: 'size-6',
  microsoft: 'size-6',
  github: 'size-6 text-[#181717] dark:text-white',
  apple: 'size-6',
}

function setBindTokenCookie(value: string) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${BIND_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${BIND_MAX_AGE}; SameSite=Lax${secure}`
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
  const { t } = useI18n()
  const enabled = new Set(enabledProviderIds.map((x) => x.toLowerCase()))
  const excluded = new Set(excludeProviderIds.map((x) => x.toLowerCase()))

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
        const name = PROVIDER_DISPLAY_NAME[id]
        const label = t('auth.oauthContinue').replace('{name}', name)
        const bindBlocked = mode === 'bind' && !getToken
        const hint = !isOn ? t('auth.oauthNotConfiguredHint') : bindBlocked ? t('auth.oauthBindNeedToken') : undefined
        const ProviderIcon = PROVIDER_ICON[id]
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
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-kumo-border bg-kumo-background"
              aria-hidden
            >
              <ProviderIcon className={PROVIDER_ICON_CLASS[id]} aria-hidden />
            </span>
            <Text size="sm" DANGEROUS_className="min-w-0 flex-1 font-medium">
              {label}
            </Text>
          </button>
        )}
      )}
    </div>
  )
}
