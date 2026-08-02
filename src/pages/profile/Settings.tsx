import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Key, Trash } from '@phosphor-icons/react'
import { startRegistration } from '@simplewebauthn/browser'
import { useNavigate, useParams } from 'react-router-dom'
import * as oauthApi from '@/api/oauth'
import * as passkeyApi from '@/api/passkey'
import {
  OAUTH_PROVIDER_DISPLAY_NAME,
  OAUTH_PROVIDER_ICON,
  OAUTH_PROVIDER_ICON_CLASS,
  type OauthProviderId,
  OAuthButtons,
} from '@/components/auth/OAuthButtons'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { ArcadeExtraSettings } from '@/components/settings/ArcadeExtraSettings'
import { ChusanExtraSettings } from '@/features/chu3/components/ChusanExtraSettings'
import { GameOptionFields } from '@/components/settings/GameOptionFields'
import { GlobalGameSettingsSection } from '@/components/settings/GlobalGameSettingsSection'
import { useAppTexts } from '@/content/texts'
import { readToken, useAuth } from '@/hooks/useAuth'
import { qk } from '@/lib/query'
import * as settingsApi from '@/api/settings'
import * as userApi from '@/api/user'
import { useI18n } from '@/lib/i18n'
import { Button, Input, Tabs } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { useToast } from '@/components/ui/toast'
import { ClipboardField } from '@/components/ui/ClipboardField'
import { Text } from '@/components/ui/Text'
import { formatDateTime } from '@/lib/datetime'

const SETTING_TABS = ['profile', 'global', 'chu3', 'mai2', 'ongeki', 'wacca'] as const

function ProfileSkeleton() {
  return (
    <div className="mt-4 flex max-w-md flex-col gap-3">
      <SkeletonBox className="h-4 w-28 rounded-md" />
      <SkeletonBox className="h-10 w-full rounded-lg" />
      <SkeletonBox className="h-4 w-24 rounded-md" />
      <SkeletonBox className="h-10 w-full rounded-lg" />
      <SkeletonBox className="h-10 w-28 rounded-lg" />
      <SkeletonBox className="h-4 w-40 rounded-md" />
    </div>
  )
}

function SettingListSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      <SkeletonBox className="h-11 w-full rounded-lg" />
      <SkeletonBox className="h-11 w-full rounded-lg" />
      <SkeletonBox className="h-11 w-full rounded-lg" />
      <SkeletonBox className="h-11 w-4/5 rounded-lg" />
    </div>
  )
}

function passkeyTime(raw: string | undefined, locale: 'zh' | 'en') {
  return raw ? formatDateTime(raw, locale) : ''
}

function isOauthProviderId(value: string): value is OauthProviderId {
  return value in OAUTH_PROVIDER_DISPLAY_NAME
}

function oauthShowName(row: oauthApi.OAuthLinkedAccount) {
  const name = row.providerName?.trim()
  if (name) return name
  const email = row.providerEmail?.trim()
  if (email) return email
  return null
}

export function SettingsPage() {
  const { page } = useParams<{ page?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { locale } = useI18n()
  const copy = useAppTexts()
  const { user: me, refresh, loading: loadingUser } = useAuth()
  const tab = SETTING_TABS.some((x) => x === page)
    ? (page as (typeof SETTING_TABS)[number])
    : 'profile'
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pkMsg, setPkMsg] = useState<string | null>(null)
  const [pkErr, setPkErr] = useState<string | null>(null)
  const [pkBusy, setPkBusy] = useState(false)
  const [bindCode, setBindCode] = useState<userApi.UserBotBindCode | null>(null)

  const providersQuery = useQuery({
    queryKey: qk.oauthProviders,
    queryFn: () => oauthApi.getProviders(),
    enabled: tab === 'profile',
    staleTime: 60_000,
  })

  const linkedQuery = useQuery({
    queryKey: qk.oauthLinked,
    queryFn: () => oauthApi.getLinkedAccounts(),
    enabled: tab === 'profile' && !!me,
  })

  const passkeysQuery = useQuery({
    queryKey: qk.passkeys,
    queryFn: () => passkeyApi.passkeyList(),
    enabled: tab === 'profile' && !!me,
  })

  const botBindingQuery = useQuery({
    queryKey: qk.botBinding,
    queryFn: () => userApi.botBinding(),
    enabled: tab === 'profile' && !!me,
  })

  const optQuery = useQuery({
    queryKey: qk.settings,
    placeholderData: (old) => old,
    queryFn: async () => settingsApi.getSettings(),
  })

  useEffect(() => {
    setDisplayName(me?.displayName || '')
    setBio(me?.profileBio || '')
  }, [me?.displayName, me?.profileBio])

  async function unlinkOauth(provider: string) {
    setPkErr(null)
    setPkMsg(null)
    try {
      await oauthApi.unlinkAccount(provider)
      await qc.invalidateQueries({ queryKey: qk.oauthLinked })
      setPkMsg(copy.settingsPage.auth.oauthUnlinked)
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : copy.common.failed)
    }
  }

  async function addPasskey() {
    setPkErr(null)
    setPkMsg(null)
    setPkBusy(true)
    try {
      const optionsJSON = await passkeyApi.passkeyRegisterOptions()
      const att = await startRegistration({ optionsJSON })
      await passkeyApi.passkeyRegisterVerify(att)
      await qc.invalidateQueries({ queryKey: qk.passkeys })
      setPkMsg(copy.settingsPage.auth.passkeyAdded)
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : copy.settingsPage.auth.passkeyError)
    } finally {
      setPkBusy(false)
    }
  }

  async function removePasskey(credentialId: string) {
    setPkErr(null)
    setPkMsg(null)
    setPkBusy(true)
    try {
      await passkeyApi.passkeyRemove(credentialId)
      await qc.invalidateQueries({ queryKey: qk.passkeys })
      setPkMsg(copy.settingsPage.auth.passkeyRemoved)
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : copy.settingsPage.auth.passkeyError)
    } finally {
      setPkBusy(false)
    }
  }

  async function saveProfile() {
    setErr(null)
    setMsg(null)
    try {
      await userApi.setting('displayName', displayName)
      await userApi.setting('profileBio', bio)
      await refresh()
      setMsg(copy.common.saved)
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.failed)
    }
  }

  async function issueBindCode() {
    setErr(null)
    try {
      const code = await userApi.issueBotBindCode()
      setBindCode(code)
      toast.add({
        title: copy.settingsPage.profile.botBindCodeReadyTitle,
        description: copy.settingsPage.profile.botBindCodeReadyDesc,
        variant: 'success',
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : copy.common.failed
      setErr(msg)
      toast.add({
        title: copy.settingsPage.profile.botBindCodeFailedTitle,
        description: msg,
        variant: 'error',
      })
    }
  }

  async function setOptKey(key: string, raw: string) {
    setErr(null)
    try {
      await settingsApi.setSetting(key, raw)
      await optQuery.refetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.common.failed)
    }
  }

  const loc = locale === 'en' ? 'en' : 'zh'
  const showProfileSkeleton = loadingUser && !me
  const options = optQuery.data ?? []
  const showOptionsSkeleton = optQuery.isPending && options.length === 0

  return (
    <div>
      <PageHeader title={copy.nav.settings} crumbs={[{ label: copy.nav.home, href: '/home' }]} />
      <Tabs
        className="mb-6"
        items={SETTING_TABS.map((value) => ({ key: value, label: copy.settingsPage.tabs[value] }))}
        activeKey={tab}
        onChange={(v) => navigate(`/settings/${v}`)}
      />
      {tab === 'profile' ? (
        <SectionCard title={<>{copy.settingsPage.profile.section}</>}>
          {showProfileSkeleton ? (
            <ProfileSkeleton />
          ) : (
            <div className="mt-4 flex max-w-md flex-col gap-3">
              <label className="flex flex-col gap-1">
                <Text className="text-sm">{copy.settingsPage.profile.displayName}</Text>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <Text className="text-sm">{copy.settingsPage.profile.bio}</Text>
                <Input value={bio} onChange={(e) => setBio(e.target.value)} />
              </label>
              {msg ? <Text className="text-app-success">{msg}</Text> : null}
              {err ? <Text className="text-app-danger">{err}</Text> : null}
              <Button onClick={saveProfile}>{copy.settingsPage.profile.save}</Button>
              <Text className="text-app-subtle text-sm">
                {copy.settingsPage.profile.email}: {me?.email ?? copy.common.empty}
              </Text>

              <div className="border-app-line mt-6 border-t pt-4">
                <Text className="text-sm mb-2 font-medium">
                  {copy.settingsPage.profile.botBindingSection}
                </Text>
                <Text className="text-sm mb-3 text-app-subtle">
                  {copy.settingsPage.profile.botBindingHint}
                </Text>
                {botBindingQuery.isPending ? (
                  <SkeletonBox className="h-10 w-full rounded-lg" />
                ) : botBindingQuery.data?.binding ? (
                  <div className="rounded-xl border border-app-line px-4 py-3">
                    <Text className="text-sm font-medium">
                      {copy.settingsPage.profile.botBound}
                    </Text>
                    <Text className="text-sm text-app-subtle">
                      {copy.settingsPage.profile.botExternalUserId}: {botBindingQuery.data.binding.externalUserId}
                    </Text>
                    {botBindingQuery.data.binding.externalUsername ? (
                      <Text className="text-sm text-app-subtle">
                        {copy.settingsPage.profile.botExternalUsername}: {botBindingQuery.data.binding.externalUsername}
                      </Text>
                    ) : null}
                  </div>
                ) : (
                  <Text className="text-sm text-app-subtle">
                    {copy.settingsPage.profile.botUnboundHint}
                  </Text>
                )}
                <div className="mt-3 flex flex-col gap-2">
                  <Button htmlType="button" onClick={() => void issueBindCode()}>
                    {copy.settingsPage.profile.generateBotBindCode}
                  </Button>
                  {bindCode ? (
                    <>
                      <ClipboardField text={bindCode.code} />
                      <Text className="text-sm text-app-subtle">
                        {copy.settingsPage.profile.botBindCodeExpires(bindCode.expiresAt)}
                      </Text>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="border-app-line mt-6 border-t pt-4">
                <Text className="text-sm mb-2 font-medium">
                  {copy.settingsPage.profile.oauthSection}
                </Text>
                {linkedQuery.isPending ? (
                  <SkeletonBox className="h-10 w-full rounded-lg" />
                ) : (
                  <ul className="mb-3 space-y-2">
                    {(linkedQuery.data ?? []).length === 0 ? (
                      <Text className="text-sm text-app-subtle">
                        {copy.settingsPage.profile.oauthEmpty}
                      </Text>
                    ) : (
                      (linkedQuery.data ?? []).map((a) => {
                        const provider = a.provider.toLowerCase()
                        const providerId: OauthProviderId | null = isOauthProviderId(provider) ? provider : null
                        const ProviderIcon = providerId ? OAUTH_PROVIDER_ICON[providerId] : null
                        const providerIconClass = providerId ? OAUTH_PROVIDER_ICON_CLASS[providerId] : ''
                        const providerName = providerId ? OAUTH_PROVIDER_DISPLAY_NAME[providerId] : a.provider
                        const providerSubtitle = oauthShowName(a)
                        return (
                          <li
                            key={a.provider}
                            className="border-app-line bg-app-base flex items-center gap-3 rounded-xl border px-4 py-3"
                          >
                            <span
                              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-app-line bg-app-base"
                              aria-hidden
                            >
                              {ProviderIcon ? (
                                <ProviderIcon className={providerIconClass} aria-hidden />
                              ) : (
                                <Text className="text-sm font-semibold uppercase">
                                  {a.provider.slice(0, 1)}
                                </Text>
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <Text className="text-sm font-medium">
                                {providerName}
                              </Text>
                              {providerSubtitle ? (
                                <Text className="text-sm text-app-subtle truncate">
                                  {providerSubtitle}
                                </Text>
                              ) : null}
                            </div>
                            <Button
                              htmlType="button"
                              type="text"
                              size="small"
                              disabled={pkBusy}
                              onClick={() => void unlinkOauth(a.provider)}
                            >
                              {copy.settingsPage.auth.oauthUnlink}
                            </Button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
                <OAuthButtons
                  mode="bind"
                  enabledProviderIds={providersQuery.data ?? []}
                  excludeProviderIds={(linkedQuery.data ?? []).map((l) => l.provider)}
                  getToken={() => readToken() ?? ''}
                  disabled={pkBusy || !readToken()}
                />
              </div>

              <div className="border-app-line mt-6 border-t pt-4">
                <Text className="text-sm mb-2 font-medium">
                  {copy.settingsPage.profile.passkeySection}
                </Text>
                {pkMsg ? <Text className="text-app-success mb-2 text-sm">{pkMsg}</Text> : null}
                {pkErr ? <Text className="text-app-danger mb-2 text-sm">{pkErr}</Text> : null}
                <Button
                  htmlType="button"
                  className="mb-3 gap-2"
                  disabled={pkBusy}
                  onClick={() => void addPasskey()}
                >
                  <Key className="size-4" weight="duotone" aria-hidden />
                  {copy.settingsPage.auth.passkeyAdd}
                </Button>
                {passkeysQuery.isPending ? (
                  <SkeletonBox className="h-10 w-full rounded-lg" />
                ) : (
                  <ul className="space-y-2">
                    {(passkeysQuery.data ?? []).length === 0 ? (
                      <Text className="text-sm text-app-subtle">
                        {copy.settingsPage.profile.passkeyEmpty}
                      </Text>
                    ) : (
                      (passkeysQuery.data ?? []).map((c) => (
                        <li
                          key={c.credentialId}
                          className="flex items-center justify-between gap-2 rounded-lg border border-app-line px-3 py-2"
                        >
                          <div className="min-w-0">
                            <Text className="text-sm truncate">
                              {c.label || c.credentialId.slice(0, 16) + '…'}
                            </Text>
                            {c.createdAt ? (
                              <Text className="text-sm text-app-subtle truncate">
                                {passkeyTime(c.createdAt, locale)}
                              </Text>
                            ) : null}
                          </div>
                          <Button
                            htmlType="button"
                            type="text"
                            size="small"

                            aria-label={copy.settingsPage.auth.passkeyRemove}
                            disabled={pkBusy}
                            onClick={() => void removePasskey(c.credentialId)}
                          >
                            <Trash className="size-4" weight="regular" />
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      ) : null}

      {tab === 'global' ? (
        <SectionCard title={<>{copy.settingsPage.global.section}</>}>
          {showOptionsSkeleton ? (
            <SettingListSkeleton />
          ) : (
            <div className="mt-4">
              <GlobalGameSettingsSection options={options} locale={loc} onSet={setOptKey} err={err} />
            </div>
          )}
        </SectionCard>
      ) : null}

      {tab === 'chu3' && showOptionsSkeleton ? (
        <SectionCard title={<>{copy.settingsPage.tabs.chu3}</>}>
          <SettingListSkeleton />
        </SectionCard>
      ) : null}

      {tab === 'chu3' && !showOptionsSkeleton && me?.username ? (
        <SectionCard title={<>{copy.settingsPage.tabs.chu3}</>}>
          <div className="mt-4">
            <ChusanExtraSettings
              username={me.username}
              options={options}
              locale={loc}
              onSet={setOptKey}
              onReload={async () => {
                await optQuery.refetch()
              }}
              err={err}
            />
          </div>
        </SectionCard>
      ) : null}

      {tab === 'chu3' && !showOptionsSkeleton && !me?.username ? (
        <Text className="text-app-subtle">{copy.settingsPage.loadingUser}</Text>
      ) : null}

      {tab === 'mai2' && showOptionsSkeleton ? (
        <SectionCard title={<>{copy.settingsPage.tabs.mai2}</>}>
          <SettingListSkeleton />
        </SectionCard>
      ) : null}

      {tab === 'mai2' && !showOptionsSkeleton && me?.username ? (
        <SectionCard title={<>{copy.settingsPage.tabs.mai2}</>}>
          <div className="mt-4">
            <ArcadeExtraSettings
              game="mai2"
              username={me.username}
              options={options}
              locale={loc}
              onSet={setOptKey}
              err={err}
            />
          </div>
        </SectionCard>
      ) : null}

      {tab === 'mai2' && !showOptionsSkeleton && !me?.username ? (
        <Text className="text-app-subtle">{copy.settingsPage.loadingUser}</Text>
      ) : null}

      {tab === 'ongeki' && showOptionsSkeleton ? (
        <SectionCard title={<>{copy.settingsPage.tabs.ongeki}</>}>
          <SettingListSkeleton />
        </SectionCard>
      ) : null}

      {tab === 'ongeki' && !showOptionsSkeleton && me?.username ? (
        <SectionCard title={<>{copy.settingsPage.tabs.ongeki}</>}>
          <div className="mt-4">
            <ArcadeExtraSettings
              game="ongeki"
              username={me.username}
              options={options}
              locale={loc}
              onSet={setOptKey}
              err={err}
            />
          </div>
        </SectionCard>
      ) : null}

      {tab === 'ongeki' && !showOptionsSkeleton && !me?.username ? (
        <Text className="text-app-subtle">{copy.settingsPage.loadingUser}</Text>
      ) : null}

      {tab === 'wacca' ? (
        <SectionCard title={<>{copy.settingsPage.tabs.wacca}</>}>
          {showOptionsSkeleton ? (
            <SettingListSkeleton />
          ) : (
            <div className="mt-4">
              <GameOptionFields
                options={options}
                gameFilter={(g) => g === 'wacca'}
                locale={loc}
                onSet={setOptKey}
                error={err}
              />
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  )
}
