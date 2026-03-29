import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import { ChusanExtraSettings } from '../../components/settings/ChusanExtraSettings'
import { GameOptionFields } from '../../components/settings/GameOptionFields'
import { GlobalGameSettingsSection } from '../../components/settings/GlobalGameSettingsSection'
import { Mai2ExtraSettings } from '../../components/settings/Mai2ExtraSettings'
import { useAuth } from '../../hooks/useAuth'
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

export function SettingsPage() {
  const { page } = useParams<{ page?: string }>()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { user: me, refresh, loading: loadingUser } = useAuth()
  const tab = SETTING_TABS.some((x) => x.value === page)
    ? (page as (typeof SETTING_TABS)[number]['value'])
    : 'profile'
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const optQuery = useQuery({
    queryKey: qk.settings,
    placeholderData: (old) => old,
    queryFn: async () => settingsApi.getSettings(),
  })

  useEffect(() => {
    setDisplayName(me?.displayName || '')
    setBio(me?.profileBio || '')
  }, [me?.displayName, me?.profileBio])

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
