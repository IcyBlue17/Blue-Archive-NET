import { useEffect, useState } from 'react'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Select } from '@cloudflare/kumo/components/select'
import { Text } from '@cloudflare/kumo/components/text'
import { useAuth } from '../../hooks/useAuth'
import * as userApi from '../../api/user'
import { settingFieldLabel } from '../../lib/settingsFieldLabels'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import { GameOptionFields } from './GameOptionFields'
import type { GameOption } from '../../lib/types'

const PREFECTURES = [
  'None',
  'Aichi',
  'Aomori',
  'Akita',
  'Ishikawa',
  'Ibaraki',
  'Iwate',
  'Ehime',
  'Oita',
  'Osaka',
  'Okayama',
  'Okinawa',
  'Kagawa',
  'Kagoshima',
  'Kanagawa',
  'Gifu',
  'Kyoto',
  'Kumamoto',
  'Gunma',
  'Kochi',
  'Saitama',
  'Saga',
  'Shiga',
  'Shizuoka',
  'Shimane',
  'Chiba',
  'Tokyo',
  'Tokushima',
  'Tochigi',
  'Tottori',
  'Toyama',
  'Nagasaki',
  'Nagano',
  'Nara',
  'Niigata',
  'Hyogo',
  'Hiroshima',
  'Fukui',
  'Fukuoka',
  'Fukushima',
  'Hokkaido',
  'Mie',
  'Miyagi',
  'Miyazaki',
  'Yamagata',
  'Yamaguchi',
  'Yamanashi',
  'Wakayama',
]

const ROUNDING_KEY = 'rounding'

export function GlobalGameSettingsSection({
  options,
  locale,
  onSet,
  err,
}: {
  options: GameOption[]
  locale: SettingFieldLocale
  onSet: (key: string, value: string) => Promise<void>
  err: string | null
}) {
  const { user } = useAuth()
  const [rounding, setRounding] = useState(true)
  const [region, setRegion] = useState(0)
  const [regionBusy, setRegionBusy] = useState(false)
  const [regionErr, setRegionErr] = useState<string | null>(null)

  useEffect(() => {
    const s = localStorage.getItem(ROUNDING_KEY)
    if (s === 'false') setRounding(false)
    else if (s === 'true') setRounding(true)
  }, [])

  useEffect(() => {
    const p = parseInt(String(user?.region ?? ''), 10)
    if (!Number.isNaN(p) && p > 0) setRegion(p)
    else setRegion(0)
  }, [user?.region])

  function setRoundingPersist(v: boolean) {
    setRounding(v)
    localStorage.setItem(ROUNDING_KEY, String(v))
  }

  async function onRegionChange(next: number) {
    setRegion(next)
    if (next <= 0) return
    setRegionBusy(true)
    setRegionErr(null)
    try {
      await userApi.changeRegion(next)
    } catch (e) {
      setRegionErr(e instanceof Error ? e.message : 'failed')
    } finally {
      setRegionBusy(false)
    }
  }

  const r = settingFieldLabel('rounding', locale)

  return (
    <div className="flex flex-col gap-6">
      <blockquote className="border-kumo-border text-kumo-subtle border-l-2 pl-3 text-sm">
        {locale === 'zh'
          ? '以下选项主要影响网页上的分数与图表显示；机台连接方式请参见配置指南。'
          : 'These options mainly affect score display on the web; see setup for cab connection.'}
      </blockquote>

      <Checkbox
        controlFirst
        className="items-start"
        label={
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{r.name}</span>
            <span className="text-kumo-subtle text-xs">{r.desc}</span>
          </span>
        }
        checked={rounding}
        onCheckedChange={(c) => setRoundingPersist(c)}
      />

      <div className="bg-kumo-border h-px w-full opacity-40" />

      <blockquote className="border-kumo-border text-kumo-subtle border-l-2 pl-3 text-sm">
        {locale === 'zh'
          ? '地区用于排行榜等区域相关功能。'
          : 'Region is used for regional leaderboard features.'}
      </blockquote>

      <div className="flex max-w-md flex-col gap-2">
        <span className="text-sm font-medium">{locale === 'zh' ? '都道府县' : 'Prefecture'}</span>
        <span className="text-kumo-subtle text-xs">
          {locale === 'zh' ? '更改后立即同步到账户。' : 'Saved to your account when changed.'}
        </span>
        <Select
          className="max-w-md"
          aria-label={locale === 'zh' ? '都道府县' : 'Prefecture'}
          value={region}
          disabled={regionBusy}
          onValueChange={(v) => void onRegionChange(Number(v))}
        >
          <Select.Option value={0}>{locale === 'zh' ? '请选择…' : 'Select…'}</Select.Option>
          {PREFECTURES.slice(1).map((name, i) => (
            <Select.Option key={name} value={i + 1}>
              {name}
            </Select.Option>
          ))}
        </Select>
        {regionErr ? <Text DANGEROUS_className="text-kumo-danger text-sm">{regionErr}</Text> : null}
      </div>

      <div className="bg-kumo-border h-px w-full opacity-40" />

      <div>
        <Text DANGEROUS_className="mb-3" size="sm">
          {locale === 'zh' ? '账户级选项' : 'Profile options'}
        </Text>
        <GameOptionFields
          options={options}
          gameFilter={(g) => g === 'profile'}
          locale={locale}
          onSet={onSet}
          error={err}
        />
      </div>
    </div>
  )
}
