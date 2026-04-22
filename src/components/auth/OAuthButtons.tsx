
import type { ComponentType, SVGProps } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import { OAUTH_API_ORIGIN } from '../../lib/config'
import { useAppTexts } from '../../content/texts'

import AppleLogo from '~icons/logos/apple'

import GithubLogo from '~icons/simple-icons/github'

import GoogleLogo from '~icons/logos/google-icon'

import MicrosoftLogo from '~icons/logos/microsoft-icon'

export const OAUTH_PROVIDER_ORDER = ['google', 'microsoft', 'github', 'apple'] as const
export type OauthProviderId = (typeof OAUTH_PROVIDER_ORDER)[number]

export const OAUTH_PROVIDER_DISPLAY_NAME: Record<OauthProviderId, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  github: 'GitHub',
  apple: 'Apple',
}

type OauthIcon = ComponentType<SVGProps<SVGSVGElement>>

export const OAUTH_PROVIDER_ICON: Record<OauthProviderId, OauthIcon> = {
  google: GoogleLogo,
  microsoft: MicrosoftLogo,
  github: GithubLogo,
  apple: AppleLogo,
}

export const OAUTH_PROVIDER_ICON_CLASS: Record<OauthProviderId, string> = {
  google: 'size-6',
  microsoft: 'size-6',
  github: 'size-6 text-[#181717] dark:text-white',
  apple: 'size-6',
}

export type OAuthButtonsProps = {
  mode: 'login' | 'bind'

  enabledProviderIds: string[]

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
  const texts = useAppTexts()
  const enabled = new Set(enabledProviderIds.map((x) => x.toLowerCase()))
  const excluded = new Set(excludeProviderIds.map((x) => x.toLowerCase()))

  async function go(provider: string) {
    const origin = OAUTH_API_ORIGIN().replace(/\/$/, '')
    if (mode === 'bind') {
      const tokenFn = getToken
      if (!tokenFn) return
      const tok = await Promise.resolve(tokenFn())
      if (!tok) return
      const url = `${origin}/api/v2/user/oauth/bind/${encodeURIComponent(provider)}?token=${encodeURIComponent(tok)}`
      window.location.assign(url)
      return
    }
    const url = `${origin}/oauth2/authorization/${encodeURIComponent(provider)}`
    window.location.assign(url)
  }

  return (
    <div className="flex flex-col gap-2.5">
      {OAUTH_PROVIDER_ORDER.map((id) => {
        if (excluded.has(id)) return null
        const isOn = enabled.has(id)
        const name = OAUTH_PROVIDER_DISPLAY_NAME[id]
        const label = texts.authPages.oauthContinue(name)
        const bindBlocked = mode === 'bind' && !getToken
        const hint = !isOn ? texts.authPages.oauthNotConfiguredHint : bindBlocked ? texts.authPages.oauthBindNeedToken : undefined
        const ProviderIcon = OAUTH_PROVIDER_ICON[id]
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
              'border-kumo-line bg-kumo-base text-kumo-default flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ' +
              (isOn && !disabled && !bindBlocked
                ? 'hover:bg-kumo-fill-hover cursor-pointer'
                : 'cursor-not-allowed opacity-55')
            }
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-kumo-line bg-kumo-base"
              aria-hidden
            >
              <ProviderIcon className={OAUTH_PROVIDER_ICON_CLASS[id]} aria-hidden />
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
