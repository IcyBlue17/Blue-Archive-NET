import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Select } from '@cloudflare/kumo/components/select'
import { getAppTexts } from '../../content/texts'
import type { GameOption } from '../../lib/types'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'

type RewardOption = {
  itemKind: number
  itemId: number
  label: string
}

const NONE_VALUE = '__none__'

function parseTokens(
  raw: string,
  allowed: Set<string>,
): Array<{ itemKind: number; itemId: number }> {
  return raw
    .split(/[,\n\r;]+/)
    .map((one) => one.trim())
    .filter(Boolean)
    .map((token) => {
      const m = /^(\d+)\s*:\s*(\d+)/.exec(token)
      if (!m) return null
      const explicitKind = Number(m[1])
      const itemId = Number(m[2])
      if (!allowed.has(`${explicitKind}:${itemId}`)) return null
      return { itemKind: explicitKind, itemId }
    })
    .filter((one): one is { itemKind: number; itemId: number } => one != null)
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
  const ticketOptions = copy.chusanLoginRewards.ticketOptions as RewardOption[]
  const allowedValues = useMemo(
    () => new Set(ticketOptions.map((one) => `${one.itemKind}:${one.itemId}`)),
    [ticketOptions],
  )

  const ticketItems = useMemo(() => {
    const items: Record<string, string> = { [NONE_VALUE]: copy.chusanLoginRewards.none }
    for (const one of ticketOptions) items[`${one.itemKind}:${one.itemId}`] = one.label
    return items
  }, [copy.chusanLoginRewards.none, ticketOptions])

  useEffect(() => {
    const parsed = parseTokens(rawValue, allowedValues)
    const ticket = parsed[0]
    setTicketValue(ticket ? `${ticket.itemKind}:${ticket.itemId}` : NONE_VALUE)
  }, [allowedValues, rawValue])

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
