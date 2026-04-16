import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Select } from '@cloudflare/kumo/components/select'
import { getAppTexts } from '../../content/texts'
import type { GameOption } from '../../lib/types'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'

type RewardOption = {
  itemKind: number
  itemId: number
  zh: string
  en: string
}

const TICKET_OPTIONS: RewardOption[] = [
  { itemKind: 5, itemId: 110, zh: 'CHUNITHM-NET 标准票', en: 'CHUNITHM-NET Standard Ticket' },
  { itemKind: 5, itemId: 302, zh: '角色 EXP x3.0 票', en: 'Character EXP x3.0 Ticket' },
  { itemKind: 5, itemId: 312, zh: '角色 EXP x6.0 票', en: 'Character EXP x6.0 Ticket' },
  { itemKind: 5, itemId: 313, zh: '角色 EXP x9.0 票', en: 'Character EXP x9.0 Ticket' },
  { itemKind: 5, itemId: 314, zh: '角色 EXP x12.0 票', en: 'Character EXP x12.0 Ticket' },
  { itemKind: 5, itemId: 320, zh: '角色 EXP 储存票', en: 'Character EXP Stock Ticket' },
  { itemKind: 5, itemId: 321, zh: '角色 EXP 储存票（赠送）', en: 'Character EXP Stock Ticket (Gift)' },
  { itemKind: 5, itemId: 402, zh: 'MASTER 游玩票', en: 'MASTER Play Ticket' },
  { itemKind: 5, itemId: 601, zh: 'ULTIMA 游玩票', en: 'ULTIMA Play Ticket' },
  { itemKind: 5, itemId: 701, zh: "WORLD'S END 游玩票", en: "WORLD'S END Play Ticket" },
  { itemKind: 5, itemId: 2020, zh: '地图进度 x2（高级）', en: 'Map Progress x2 (Premium)' },
  { itemKind: 5, itemId: 2040, zh: '地图进度 x3（高级）', en: 'Map Progress x3 (Premium)' },
  { itemKind: 5, itemId: 2060, zh: '地图进度 x4（高级）', en: 'Map Progress x4 (Premium)' },
  { itemKind: 5, itemId: 3060, zh: '角色 EXP x6.0 票（高级）', en: 'Character EXP x6.0 Ticket (Premium)' },
  { itemKind: 5, itemId: 3090, zh: '角色 EXP x9.0 票（高级）', en: 'Character EXP x9.0 Ticket (Premium)' },
  { itemKind: 5, itemId: 3120, zh: '角色 EXP x12.0 票（高级）', en: 'Character EXP x12.0 Ticket (Premium)' },
  { itemKind: 5, itemId: 5020, zh: '地图进度 x2（礼物）', en: 'Map Progress x2 (Gift)' },
  { itemKind: 5, itemId: 5040, zh: '地图进度 x3（礼物）', en: 'Map Progress x3 (Gift)' },
  { itemKind: 5, itemId: 5060, zh: '地图进度 x4（礼物）', en: 'Map Progress x4 (Gift)' },
  { itemKind: 5, itemId: 5510, zh: 'SPECIAL 票（当日限定）', en: 'SPECIAL Ticket (Day Only)' },
]

const NONE_VALUE = '__none__'

function parseTokens(raw: string): Array<{ itemKind: number; itemId: number }> {
  return raw
    .split(/[,\n\r;]+/)
    .map((one) => one.trim())
    .filter(Boolean)
    .map((token) => {
      const m = /^(\d+)\s*:\s*(\d+)/.exec(token)
      if (!m) return null
      const itemId = Number(m[2])
      const explicitKind = Number(m[1])
      const itemKind = TICKET_OPTIONS.find((one) => one.itemId === itemId)?.itemKind
      if (explicitKind !== itemKind) return null
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
  const copy = getAppTexts(locale)
  const rawValue = String(options.find((o) => o.key === 'chusanLoginRewardItems')?.value ?? '')
  const [ticketValue, setTicketValue] = useState(NONE_VALUE)
  const [saving, setSaving] = useState(false)

  const ticketItems = useMemo(() => {
    const items: Record<string, string> = { [NONE_VALUE]: copy.chusanLoginRewards.none }
    for (const one of TICKET_OPTIONS) items[`${one.itemKind}:${one.itemId}`] = displayName(one, locale)
    return items
  }, [copy.chusanLoginRewards.none, locale])

  useEffect(() => {
    const parsed = parseTokens(rawValue)
    const ticket = parsed[0]
    setTicketValue(ticket ? `${ticket.itemKind}:${ticket.itemId}` : NONE_VALUE)
  }, [rawValue])

  async function saveRewards() {
    setSaving(true)
    try {
      await onSet('chusanLoginRewardItems', ticketValue === NONE_VALUE ? '' : ticketValue)
      await onReload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{copy.chusanLoginRewards.ticket}</span>
        <Select
          value={ticketValue}
          items={ticketItems}
          onValueChange={(value) => setTicketValue(String(value ?? NONE_VALUE))}
        />
      </label>

      <div>
        <Button size="sm" variant="secondary" disabled={saving} onClick={() => void saveRewards()}>
          {copy.chusanLoginRewards.save}
        </Button>
      </div>
    </div>
  )
}
