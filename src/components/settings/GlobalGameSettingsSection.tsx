import { useEffect, useState } from 'react'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Select } from '@cloudflare/kumo/components/select'
import { Text } from '@cloudflare/kumo/components/text'
import { getAppTexts } from '../../content/texts'
import { useAuth } from '../../hooks/useAuth'
import * as userApi from '../../api/user'
import { settingFieldLabel } from '../../lib/settingsFieldLabels'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import { GameOptionFields } from './GameOptionFields'
import type { GameOption } from '../../lib/types'

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
  const copy = getAppTexts(locale)
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
      setRegionErr(e instanceof Error ? e.message : copy.common.failed)
    } finally {
      setRegionBusy(false)
    }
  }

  const r = settingFieldLabel('rounding', locale)

  return (
    <div className="flex flex-col gap-6">
      <blockquote className="border-kumo-line text-kumo-subtle border-l-2 pl-3 text-sm">
        {copy.globalSettings.webHint}
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

      <div className="bg-kumo-line h-px w-full opacity-40" />

      <blockquote className="border-kumo-line text-kumo-subtle border-l-2 pl-3 text-sm">
        {copy.globalSettings.regionHint}
      </blockquote>

      <div className="flex max-w-md flex-col gap-2">
        <span className="text-sm font-medium">{copy.globalSettings.prefecture}</span>
        <span className="text-kumo-subtle text-xs">{copy.globalSettings.syncHint}</span>
        <Select
          className="max-w-md"
          aria-label={copy.globalSettings.prefecture}
          value={region}
          disabled={regionBusy}
          onValueChange={(v) => void onRegionChange(Number(v))}
        >
          <Select.Option value={0}>{copy.globalSettings.select}</Select.Option>
          {copy.globalSettings.prefectures.slice(1).map((name, i) => (
            <Select.Option key={name} value={i + 1}>
              {name}
            </Select.Option>
          ))}
        </Select>
        {regionErr ? <Text DANGEROUS_className="text-kumo-danger text-sm">{regionErr}</Text> : null}
      </div>

      <div className="bg-kumo-line h-px w-full opacity-40" />

      <div>
        <Text DANGEROUS_className="mb-3" size="sm">
          {copy.globalSettings.profileOptions}
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
