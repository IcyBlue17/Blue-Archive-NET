import { useEffect, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import * as gameApi from '../../api/game'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import type { GameOption } from '../../lib/types'
import { GameOptionFields } from './GameOptionFields'

export function Mai2ExtraSettings({
  username,
  options,
  locale,
  onSet,
  err,
}: {
  username: string
  options: GameOption[]
  locale: SettingFieldLocale
  onSet: (key: string, value: string) => Promise<void>
  err: string | null
}) {
  const [inGameName, setInGameName] = useState('')
  const [nameDirty, setNameDirty] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!username) return
    void gameApi
      .userSummary(username, 'mai2')
      .then((s) => {
        setInGameName(s.name ?? '')
        setNameDirty(false)
      })
      .catch(() => {})
  }, [username])

  async function saveName() {
    setNameSaving(true)
    try {
      const r = await gameApi.changeName('mai2', inGameName.trim())
      setInGameName(r.newName)
      setNameDirty(false)
    } finally {
      setNameSaving(false)
    }
  }

  async function doExport() {
    setExporting(true)
    try {
      const data = await gameApi.exportGame('mai2')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `export-mai2-${inGameName || username}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text DANGEROUS_className="text-kumo-danger text-sm">{err}</Text> : null}

      <div className="flex max-w-xl flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{locale === 'zh' ? '游戏内名称' : 'In-game name'}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={inGameName}
              onChange={(e) => {
                setInGameName(e.target.value)
                setNameDirty(true)
              }}
              placeholder={locale === 'zh' ? '未设置' : 'Unset'}
            />
            {nameDirty && inGameName.trim() ? (
              <Button size="sm" variant="secondary" disabled={nameSaving} onClick={() => void saveName()}>
                {locale === 'zh' ? '保存' : 'Save'}
              </Button>
            ) : null}
          </div>
        </label>
      </div>

      <GameOptionFields
        options={options}
        gameFilter={(g) => g === 'mai2'}
        locale={locale}
        onSet={onSet}
      />

      <Button variant="secondary" disabled={exporting} onClick={() => void doExport()}>
        {locale === 'zh' ? '导出 maimai 存档 (JSON)' : 'Export maimai save (JSON)'}
      </Button>
    </div>
  )
}
