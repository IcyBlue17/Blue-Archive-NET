import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Key, Trash } from '@phosphor-icons/react'
import { startRegistration } from '@simplewebauthn/browser'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import * as oauthApi from '../../api/oauth'
import * as passkeyApi from '../../api/passkey'
import { OAuthButtons } from '../../components/auth/OAuthButtons'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import { ChusanExtraSettings } from '../../components/settings/ChusanExtraSettings'
import { GameOptionFields } from '../../components/settings/GameOptionFields'
import { GlobalGameSettingsSection } from '../../components/settings/GlobalGameSettingsSection'
import { Mai2ExtraSettings } from '../../components/settings/Mai2ExtraSettings'
import { readToken, useAuth } from '../../hooks/useAuth'
import { qk } from '../../lib/query'
import * as settingsApi from '../../api/settings'
import * as userApi from '../../api/user'
import { useI18n } from '../../lib/i18n'

const SETTING_TABS = [
  { value: 'profile', labelKey: 'settings.tab.profile' },
  { value: 'global', labelKey: 'settings.tab.global' },
  { value: 'chu3', labelKey: 'settings.tab.chu3' },
  { value: 'mai2', labelKey: 'settings.tab.mai2' },
  { value: 'ongeki', labelKey: 'settings.tab.ongeki' },
  { value: 'wacca', labelKey: 'settings.tab.wacca' },
] as const

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

function passkeyTime1(raw1: string | undefined, locale1: 'zh' | 'en') {
  if (!raw1) return ''
  const d1 = new Date(raw1)
  if (Number.isNaN(d1.getTime())) return raw1
  return d1.toLocaleString(locale1 === 'zh' ? 'zh-CN' : 'en-US')
}

export function SettingsPage() {
  const { page } = useParams<{ page?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t, locale } = useI18n()
  const { user: me, refresh, loading: loadingUser } = useAuth()
  const tab = SETTING_TABS.some((x) => x.value === page)
    ? (page as (typeof SETTING_TABS)[number]['value'])
    : 'profile'
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pkMsg, setPkMsg] = useState<string | null>(null)
  const [pkErr, setPkErr] = useState<string | null>(null)
  const [pkBusy, setPkBusy] = useState(false)

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
      setPkMsg(t('auth.oauthUnlinked'))
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : 'failed')
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
      setPkMsg(t('auth.passkeyAdded'))
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : t('auth.passkeyError'))
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
      setPkMsg(t('auth.passkeyRemoved'))
    } catch (e) {
      setPkErr(e instanceof Error ? e.message : t('auth.passkeyError'))
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
      setMsg(locale === 'zh' ? '已保存' : 'Saved')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    }
  }

  async function setOptKey(key: string, raw: string) {
    setErr(null)
    try {
      await settingsApi.setSetting(key, raw)
      await optQuery.refetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    }
  }

  const loc = locale === 'en' ? 'en' : 'zh'
  const showProfileSkeleton = loadingUser && !me
  const options = optQuery.data ?? []
  const showOptionsSkeleton = optQuery.isPending && options.length === 0

  return (
    <div>
      <PageHeader title={t('settings')} crumbs={[{ label: t('home'), href: '/home' }]} />
      <Tabs
        className="mb-6"
        variant="underline"
        tabs={SETTING_TABS.map((x) => ({ value: x.value, label: t(x.labelKey) }))}
        value={tab}
        onValueChange={(v) => navigate(`/settings/${v}`)}
      />
      {tab === 'profile' ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.profile.section')}</LayerCard.Secondary>
          {showProfileSkeleton ? (
            <ProfileSkeleton />
          ) : (
            <div className="mt-4 flex max-w-md flex-col gap-3">
              <label className="flex flex-col gap-1">
                <Text size="sm">{t('settings.profile.displayName')}</Text>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1">
                <Text size="sm">{t('settings.profile.bio')}</Text>
                <Input value={bio} onChange={(e) => setBio(e.target.value)} />
              </label>
              {msg ? <Text DANGEROUS_className="text-kumo-success">{msg}</Text> : null}
              {err ? <Text DANGEROUS_className="text-kumo-danger">{err}</Text> : null}
              <Button onClick={saveProfile}>{t('settings.profile.save')}</Button>
              <Text DANGEROUS_className="text-kumo-subtle text-sm">
                {t('settings.profile.email')}: {me?.email ?? '—'}
              </Text>

              <div className="border-kumo-border mt-6 border-t pt-4">
                <Text size="sm" DANGEROUS_className="mb-2 font-medium">
                  {t('settings.profile.oauthSection')}
                </Text>
                {linkedQuery.isPending ? (
                  <SkeletonBox className="h-10 w-full rounded-lg" />
                ) : (
                  <ul className="mb-3 space-y-2">
                    {(linkedQuery.data ?? []).length === 0 ? (
                      <Text size="sm" DANGEROUS_className="text-kumo-subtle">
                        {t('settings.profile.oauthEmpty')}
                      </Text>
                    ) : (
                      (linkedQuery.data ?? []).map((a) => (
                        <li
                          key={a.provider}
                          className="flex items-center justify-between gap-2 rounded-lg border border-kumo-border px-3 py-2"
                        >
                          <Text size="sm">{a.provider}</Text>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pkBusy}
                            onClick={() => void unlinkOauth(a.provider)}
                          >
                            {t('auth.oauthUnlink')}
                          </Button>
                        </li>
                      ))
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

              <div className="border-kumo-border mt-6 border-t pt-4">
                <Text size="sm" DANGEROUS_className="mb-2 font-medium">
                  {t('settings.profile.passkeySection')}
                </Text>
                {pkMsg ? <Text DANGEROUS_className="text-kumo-success mb-2 text-sm">{pkMsg}</Text> : null}
                {pkErr ? <Text DANGEROUS_className="text-kumo-danger mb-2 text-sm">{pkErr}</Text> : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="mb-3 gap-2"
                  disabled={pkBusy}
                  onClick={() => void addPasskey()}
                >
                  <Key className="size-4" weight="duotone" aria-hidden />
                  {t('auth.passkeyAdd')}
                </Button>
                {passkeysQuery.isPending ? (
                  <SkeletonBox className="h-10 w-full rounded-lg" />
                ) : (
                  <ul className="space-y-2">
                    {(passkeysQuery.data ?? []).length === 0 ? (
                      <Text size="sm" DANGEROUS_className="text-kumo-subtle">
                        {t('settings.profile.passkeyEmpty')}
                      </Text>
                    ) : (
                      (passkeysQuery.data ?? []).map((c) => (
                        <li
                          key={c.credentialId}
                          className="flex items-center justify-between gap-2 rounded-lg border border-kumo-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <Text size="sm" DANGEROUS_className="truncate">
                              {c.label || c.credentialId.slice(0, 16) + '…'}
                            </Text>
                            {c.createdAt ? (
                              <Text size="sm" DANGEROUS_className="text-kumo-subtle truncate">
                                {passkeyTime1(c.createdAt, locale)}
                              </Text>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            shape="square"
                            aria-label={t('auth.passkeyRemove')}
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
        </LayerCard>
      ) : null}

      {tab === 'global' ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.global.section')}</LayerCard.Secondary>
          {showOptionsSkeleton ? (
            <SettingListSkeleton />
          ) : (
            <div className="mt-4">
              <GlobalGameSettingsSection options={options} locale={loc} onSet={setOptKey} err={err} />
            </div>
          )}
        </LayerCard>
      ) : null}

      {tab === 'chu3' && showOptionsSkeleton ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.tab.chu3')}</LayerCard.Secondary>
          <SettingListSkeleton />
        </LayerCard>
      ) : null}

      {tab === 'chu3' && !showOptionsSkeleton && me?.username ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.tab.chu3')}</LayerCard.Secondary>
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
        </LayerCard>
      ) : null}

      {tab === 'chu3' && !showOptionsSkeleton && !me?.username ? (
        <Text DANGEROUS_className="text-kumo-subtle">{t('settings.loadingUser')}</Text>
      ) : null}

      {tab === 'mai2' && showOptionsSkeleton ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.tab.mai2')}</LayerCard.Secondary>
          <SettingListSkeleton />
        </LayerCard>
      ) : null}

      {tab === 'mai2' && !showOptionsSkeleton && me?.username ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.tab.mai2')}</LayerCard.Secondary>
          <div className="mt-4">
            <Mai2ExtraSettings
              username={me.username}
              options={options}
              locale={loc}
              onSet={setOptKey}
              err={err}
            />
          </div>
        </LayerCard>
      ) : null}

      {tab === 'mai2' && !showOptionsSkeleton && !me?.username ? (
        <Text DANGEROUS_className="text-kumo-subtle">{t('settings.loadingUser')}</Text>
      ) : null}

      {tab === 'ongeki' ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.tab.ongeki')}</LayerCard.Secondary>
          {showOptionsSkeleton ? (
            <SettingListSkeleton />
          ) : (
            <div className="mt-4">
              <GameOptionFields
                options={options}
                gameFilter={(g) => g === 'ongeki'}
                locale={loc}
                onSet={setOptKey}
                error={err}
              />
            </div>
          )}
        </LayerCard>
      ) : null}

      {tab === 'wacca' ? (
        <LayerCard className="p-4">
          <LayerCard.Secondary>{t('settings.tab.wacca')}</LayerCard.Secondary>
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
        </LayerCard>
      ) : null}
    </div>
  )
}
