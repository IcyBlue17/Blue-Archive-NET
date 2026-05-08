import { useEffect, useMemo, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Checkbox } from '@cloudflare/kumo/components/checkbox'
import { Input } from '@cloudflare/kumo/components/input'
import { Select } from '@cloudflare/kumo/components/select'
import { Text } from '@cloudflare/kumo/components/text'
import { getAppTexts } from '../../content/texts'
import type { GameOption } from '../../lib/types'
import { settingFieldLabel, type SettingFieldLocale } from '../../lib/settingsFieldLabels'

function typeBool(t: string) {
  return t.toLowerCase() === 'boolean'
}

function typeNumeric(t: string) {
  const x = t.toLowerCase()
  return x === 'int' || x === 'integer' || x === 'long' || x === 'short' || x === 'byte'
}

export function GameOptionFields({
  options,
  gameFilter,
  locale,
  onSet,
  error,
}: {
  options: GameOption[]
  gameFilter: (game: string) => boolean
  locale: SettingFieldLocale
  onSet: (key: string, value: string) => Promise<void>
  error?: string | null
}) {
  const copy = getAppTexts(locale)
  const fields = useMemo(() => options.filter((o) => gameFilter(o.game)), [options, gameFilter])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const f of fields) {
      if (typeBool(f.type)) continue
      next[f.key] = f.value == null ? '' : String(f.value)
    }
    setDraft(next)
  }, [fields])

  async function saveKey(key: string, value: string) {
    setSaving(key)
    try {
      await onSet(key, value)
    } finally {
      setSaving(null)
    }
  }

  async function toggleBool(field: GameOption, checked: boolean) {
    await saveKey(field.key, checked ? 'true' : 'false')
  }

  if (!fields.length) {
    return (
      <Text DANGEROUS_className="text-kumo-subtle text-sm">{copy.gameOptionFields.empty}</Text>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Text DANGEROUS_className="text-kumo-danger text-sm">{error}</Text> : null}
      {fields.map((field) => {
        const { name, desc } = settingFieldLabel(field.key, locale)
        if (typeBool(field.type)) {
          const checked = Boolean(field.value)
          return (
            <Checkbox
              key={field.key}
              controlFirst
              className="items-start"
              label={
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-kumo-default text-sm font-medium">{name}</span>
                  {desc ? <span className="text-kumo-subtle text-xs">{desc}</span> : null}
                </span>
              }
              checked={checked}
              disabled={!!saving}
              onCheckedChange={(c) => void toggleBool(field, c)}
            />
          )
        }
        if (typeNumeric(field.type)) {
          const val = draft[field.key] ?? (field.value == null ? '' : String(field.value))
          if (field.key === 'chusanBanStatus') {
            return (
              <div key={field.key} className="flex max-w-xs flex-col gap-2">
                <label className="flex flex-col gap-0.5">
                  <span className="text-kumo-default text-sm font-medium">{name}</span>
                  {desc ? <span className="text-kumo-subtle text-xs">{desc}</span> : null}
                </label>
                <Select
                  aria-label={name}
                  value={val || '0'}
                  disabled={saving === field.key}
                  onValueChange={(v) => void saveKey(field.key, String(v ?? '0'))}
                >
                  {[0, 1, 2].map((one) => (
                    <Select.Option key={one} value={one}>
                      {one}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )
          }
          return (
            <div key={field.key} className="flex flex-col gap-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-kumo-default text-sm font-medium">{name}</span>
                {desc ? <span className="text-kumo-subtle text-xs">{desc}</span> : null}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  className="max-w-xs"
                  value={val}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={saving === field.key}
                  onClick={() => void saveKey(field.key, val)}
                >
                  {copy.gameOptionFields.save}
                </Button>
              </div>
            </div>
          )
        }
        const val = draft[field.key] ?? (field.value == null ? '' : String(field.value))
        return (
          <div key={field.key} className="flex flex-col gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-kumo-default text-sm font-medium">{name}</span>
              {desc ? <span className="text-kumo-subtle text-xs">{desc}</span> : null}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="max-w-xl flex-1"
                value={val}
                onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={saving === field.key}
                onClick={() => void saveKey(field.key, val)}
              >
                {copy.gameOptionFields.save}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
