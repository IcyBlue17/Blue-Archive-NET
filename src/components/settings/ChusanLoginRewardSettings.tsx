import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Select } from '@cloudflare/kumo/components/select'
import { Text } from '@cloudflare/kumo/components/text'
import type { GameOption } from '../../lib/types'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'

type RewardOption = {
  itemKind: number
  itemId: number
  zh: string
  en: string
}

const TICKET_OPTIONS: RewardOption[] = [
  { itemKind: 4, itemId: 110, zh: 'CHUNITHM-NET 标准票', en: 'CHUNITHM-NET Standard Ticket' },
  { itemKind: 0, itemId: 302, zh: '角色 EXP x3.0 票', en: 'Character EXP x3.0 Ticket' },
  { itemKind: 0, itemId: 312, zh: '角色 EXP x6.0 票', en: 'Character EXP x6.0 Ticket' },
  { itemKind: 0, itemId: 313, zh: '角色 EXP x9.0 票', en: 'Character EXP x9.0 Ticket' },
  { itemKind: 0, itemId: 314, zh: '角色 EXP x12.0 票', en: 'Character EXP x12.0 Ticket' },
  { itemKind: 7, itemId: 320, zh: '角色 EXP 储存票', en: 'Character EXP Stock Ticket' },
  { itemKind: 7, itemId: 321, zh: '角色 EXP 储存票（赠送）', en: 'Character EXP Stock Ticket (Gift)' },
  { itemKind: 1, itemId: 402, zh: 'MASTER 游玩票', en: 'MASTER Play Ticket' },
  { itemKind: 2, itemId: 601, zh: 'ULTIMA 游玩票', en: 'ULTIMA Play Ticket' },
  { itemKind: 3, itemId: 701, zh: "WORLD'S END 游玩票", en: "WORLD'S END Play Ticket" },
  { itemKind: 4, itemId: 2020, zh: '地图进度 x2（高级）', en: 'Map Progress x2 (Premium)' },
  { itemKind: 4, itemId: 2040, zh: '地图进度 x3（高级）', en: 'Map Progress x3 (Premium)' },
  { itemKind: 4, itemId: 2060, zh: '地图进度 x4（高级）', en: 'Map Progress x4 (Premium)' },
  { itemKind: 0, itemId: 3060, zh: '角色 EXP x6.0 票（高级）', en: 'Character EXP x6.0 Ticket (Premium)' },
  { itemKind: 0, itemId: 3090, zh: '角色 EXP x9.0 票（高级）', en: 'Character EXP x9.0 Ticket (Premium)' },
  { itemKind: 0, itemId: 3120, zh: '角色 EXP x12.0 票（高级）', en: 'Character EXP x12.0 Ticket (Premium)' },
  { itemKind: 4, itemId: 5020, zh: '地图进度 x2（礼物）', en: 'Map Progress x2 (Gift)' },
  { itemKind: 4, itemId: 5040, zh: '地图进度 x3（礼物）', en: 'Map Progress x3 (Gift)' },
  { itemKind: 4, itemId: 5060, zh: '地图进度 x4（礼物）', en: 'Map Progress x4 (Gift)' },
  { itemKind: 4, itemId: 5510, zh: 'SPECIAL 票（当日限定）', en: 'SPECIAL Ticket (Day Only)' },
]

const PENGUIN_OPTIONS: RewardOption[] = [
  { itemKind: 5, itemId: 8000, zh: '企鹅像', en: 'Penguin Statue' },
  { itemKind: 5, itemId: 8010, zh: '小企鹅像', en: 'Show-Ni Statue' },
  { itemKind: 5, itemId: 8020, zh: '灵魂像', en: 'Soul of Statue' },
  { itemKind: 5, itemId: 8030, zh: '虹限像', en: 'Rainbow Statue' },
]

const LEGACY_BOOL_KEYS = [
  'chusanLoginRewardPenguinStatue',
  'chusanLoginRewardShowNistatue',
  'chusanLoginRewardSoulOfStatue',
  'chusanLoginRewardRainbowStatue',
  'chusanLoginRewardExpTicket',
  'chusanLoginRewardMasterTicket',
  'chusanLoginRewardUltimaTicket',
  'chusanLoginRewardWorldsEndTicket',
]

function parseTokens(raw: string): Array<{ itemKind: number; itemId: number }> {
  return raw
    .split(/[,\n\r;]+/)
    .map((one) => one.trim())
    .filter(Boolean)
    .map((token) => {
      const m = /^(?:(\d+)\s*:\s*)?(\d+)/.exec(token)
      if (!m) return null
      const itemId = Number(m[2])
      const explicitKind = m[1] ? Number(m[1]) : null
      const itemKind =
        explicitKind ??
        TICKET_OPTIONS.find((one) => one.itemId === itemId)?.itemKind ??
        PENGUIN_OPTIONS.find((one) => one.itemId === itemId)?.itemKind
      if (itemKind == null) return null
      return { itemKind, itemId }
    })
    .filter((one): one is { itemKind: number; itemId: number } => one != null)
}

function displayName(one: RewardOption, locale: SettingFieldLocale): string {
  return locale === 'zh' ? one.zh : one.en
}

export function ChusanLoginRewardSettings({
  options,
  locale,
  onSet,
  onReload,
}: {
  options: GameOption[]
  locale: SettingFieldLocale
  onSet: (key: string, value: string) => Promise<void>
  onReload: () => Promise<void>
}) {
  const rawValue = String(options.find((o) => o.key === 'chusanLoginRewardItems')?.value ?? '')
  const [ticketValue, setTicketValue] = useState('')
  const [penguinValue, setPenguinValue] = useState('')
  const [saving, setSaving] = useState(false)

  const ticketSelectOptions = useMemo(
    () =>
      TICKET_OPTIONS.map((one) => ({
        value: `${one.itemKind}:${one.itemId}`,
        label: displayName(one, locale),
      })),
    [locale],
  )

  const penguinSelectOptions = useMemo(
    () =>
      PENGUIN_OPTIONS.map((one) => ({
        value: `${one.itemKind}:${one.itemId}`,
        label: displayName(one, locale),
      })),
    [locale],
  )

  useEffect(() => {
    const parsed = parseTokens(rawValue)
    const ticket = parsed.find((one) => one.itemKind !== 5)
    const penguin = parsed.find((one) => one.itemKind === 5)
    setTicketValue(ticket ? `${ticket.itemKind}:${ticket.itemId}` : '')
    setPenguinValue(penguin ? `${penguin.itemKind}:${penguin.itemId}` : '')
  }, [rawValue])

  async function saveRewards() {
    setSaving(true)
    try {
      for (const key of LEGACY_BOOL_KEYS) {
        await onSet(key, 'false')
      }
      const parts = [ticketValue, penguinValue].filter(Boolean)
      await onSet('chusanLoginRewardItems', parts.join(','))
      await onReload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 flex max-w-2xl flex-col gap-4">
      <Text DANGEROUS_className="text-kumo-subtle text-sm">
        {locale === 'zh'
          ? '每次 GameLogin 固定发放 1 个票和 1 个企鹅像；都可以设为无。'
          : 'Each GameLogin grants exactly one ticket and one penguin statue; both can be set to none.'}
      </Text>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{locale === 'zh' ? '票券' : 'Ticket'}</span>
          <Select value={ticketValue} onValueChange={(value) => setTicketValue(String(value ?? ''))}>
            <Select.Option value="">{locale === 'zh' ? '无' : 'None'}</Select.Option>
            {ticketSelectOptions.map((one) => (
              <Select.Option key={one.value} value={one.value}>
                {one.label}
              </Select.Option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{locale === 'zh' ? '企鹅' : 'Penguin'}</span>
          <Select value={penguinValue} onValueChange={(value) => setPenguinValue(String(value ?? ''))}>
            <Select.Option value="">{locale === 'zh' ? '无' : 'None'}</Select.Option>
            {penguinSelectOptions.map((one) => (
              <Select.Option key={one.value} value={one.value}>
                {one.label}
              </Select.Option>
            ))}
          </Select>
        </label>
      </div>

      <div>
        <Button size="sm" variant="secondary" disabled={saving} onClick={() => void saveRewards()}>
          {locale === 'zh' ? '保存登录奖励' : 'Save login rewards'}
        </Button>
      </div>
    </div>
  )
}
