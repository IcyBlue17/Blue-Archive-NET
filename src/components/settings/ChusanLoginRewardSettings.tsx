import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Select } from '@cloudflare/kumo/components/select'
import { Text } from '@cloudflare/kumo/components/text'
import type { GameOption } from '../../lib/types'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'

type RewardItem = {
  itemKind: number
  itemId: number
  stock: number
}

type TicketOption = {
  itemKind: number
  itemId: number
  zh: string
  en: string
}

const TICKET_OPTIONS: TicketOption[] = [
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
  { itemKind: 5, itemId: 8000, zh: '企鹅像', en: 'Penguin Statue' },
  { itemKind: 5, itemId: 8010, zh: '小企鹅像', en: 'Show-Ni Statue' },
  { itemKind: 5, itemId: 8020, zh: '灵魂像', en: 'Soul of Statue' },
  { itemKind: 5, itemId: 8030, zh: '虹限像', en: 'Rainbow Statue' },
]

const KIND_BY_ID = new Map(TICKET_OPTIONS.map((one) => [one.itemId, one.itemKind]))
const OPTION_BY_KEY = new Map(TICKET_OPTIONS.map((one) => [`${one.itemKind}:${one.itemId}`, one]))

function parseRewardToken(raw: string): RewardItem | null {
  const token = raw.trim()
  if (!token) return null
  const m = /^(?:(\d+)\s*:\s*)?(\d+)(?:\s*[xX*]\s*(\d+))?$/.exec(token)
  if (!m) return null
  const explicitKind = m[1] ? Number(m[1]) : null
  const itemId = Number(m[2])
  const stock = m[3] ? Math.max(1, Number(m[3])) : 1
  const itemKind = explicitKind ?? KIND_BY_ID.get(itemId)
  if (itemKind == null || Number.isNaN(itemKind) || Number.isNaN(itemId) || Number.isNaN(stock)) return null
  return { itemKind, itemId, stock }
}

function encodeRewardToken(one: RewardItem): string {
  return `${one.itemKind}:${one.itemId}${one.stock > 1 ? `x${one.stock}` : ''}`
}

function mergeRewards(items: RewardItem[]): RewardItem[] {
  const map = new Map<string, RewardItem>()
  for (const one of items) {
    const key = `${one.itemKind}:${one.itemId}`
    const old = map.get(key)
    if (old) old.stock += one.stock
    else map.set(key, { ...one })
  }
  return Array.from(map.values()).sort((a, b) => a.itemKind - b.itemKind || a.itemId - b.itemId)
}

function displayName(one: RewardItem, locale: SettingFieldLocale): string {
  const row = OPTION_BY_KEY.get(`${one.itemKind}:${one.itemId}`)
  if (!row) return `${one.itemKind}:${one.itemId}`
  return locale === 'zh' ? row.zh : row.en
}

export function ChusanLoginRewardSettings({
  options,
  locale,
  onSet,
}: {
  options: GameOption[]
  locale: SettingFieldLocale
  onSet: (key: string, value: string) => Promise<void>
}) {
  const rawValue = String(options.find((o) => o.key === 'chusanLoginRewardItems')?.value ?? '')
  const [selectedToken, setSelectedToken] = useState('')
  const [qty, setQty] = useState('1')
  const [draftRewards, setDraftRewards] = useState<RewardItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const parsed = rawValue
      .split(/[,\n\r;]+/)
      .map(parseRewardToken)
      .filter((one): one is RewardItem => one != null)
    setDraftRewards(mergeRewards(parsed))
  }, [rawValue])

  const selectOptions = useMemo(
    () =>
      TICKET_OPTIONS.map((one) => ({
        value: `${one.itemKind}:${one.itemId}`,
        label: `${locale === 'zh' ? one.zh : one.en} (${one.itemId})`,
      })),
    [locale],
  )

  function addReward() {
    if (!selectedToken) return
    const parsed = parseRewardToken(`${selectedToken}x${qty || '1'}`)
    if (!parsed) return
    setDraftRewards((old) => mergeRewards([...old, parsed]))
  }

  function removeReward(target: RewardItem) {
    setDraftRewards((old) =>
      old.filter((one) => !(one.itemKind === target.itemKind && one.itemId === target.itemId)),
    )
  }

  async function saveRewards() {
    setSaving(true)
    try {
      await onSet('chusanLoginRewardItems', draftRewards.map(encodeRewardToken).join(','))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <Text DANGEROUS_className="text-kumo-subtle text-sm">
        {locale === 'zh'
          ? '可选票券会在每次 GameLogin 时发放。后端会按真实票种写入库存，并额外生成登录期可见的 present 通知。'
          : 'Selected tickets are granted on every GameLogin. The backend writes the real inventory item and also queues a login-visible present notice.'}
      </Text>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[18rem] flex-col gap-1">
          <span className="text-sm font-medium">{locale === 'zh' ? '票券' : 'Ticket'}</span>
          <Select value={selectedToken} onValueChange={(value) => setSelectedToken(String(value ?? ''))}>
            <Select.Option value="">{locale === 'zh' ? '请选择…' : 'Select…'}</Select.Option>
            {selectOptions.map((one) => (
              <Select.Option key={one.value} value={one.value}>
                {one.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className="flex w-24 flex-col gap-1">
          <span className="text-sm font-medium">{locale === 'zh' ? '数量' : 'Qty'}</span>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>

        <Button size="sm" variant="secondary" disabled={!selectedToken} onClick={addReward}>
          {locale === 'zh' ? '加入列表' : 'Add'}
        </Button>
      </div>

      {draftRewards.length ? (
        <div className="flex flex-col gap-2">
          {draftRewards.map((one) => (
            <div
              key={`${one.itemKind}:${one.itemId}`}
              className="border-kumo-border bg-kumo-background flex max-w-2xl items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName(one, locale)}</span>
                <span className="text-kumo-subtle text-xs">
                  {`kind ${one.itemKind} / id ${one.itemId} / x${one.stock}`}
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => removeReward(one)}>
                {locale === 'zh' ? '移除' : 'Remove'}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Text DANGEROUS_className="text-kumo-subtle text-sm">
          {locale === 'zh' ? '当前没有自定义票券。' : 'No custom tickets selected.'}
        </Text>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={saving} onClick={() => void saveRewards()}>
          {locale === 'zh' ? '保存票券列表' : 'Save ticket list'}
        </Button>
        <Text DANGEROUS_className="text-kumo-subtle text-xs">
          {rawValue
            ? `${locale === 'zh' ? '当前原始值' : 'Current raw value'}: ${rawValue}`
            : locale === 'zh'
              ? '当前原始值为空'
              : 'Current raw value is empty'}
        </Text>
      </div>
    </div>
  )
}
