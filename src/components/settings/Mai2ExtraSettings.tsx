import { useEffect, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import * as gameApi from '../../api/game'
import { getAppTexts } from '../../content/texts'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import type { GameOption } from '../../lib/types'
import { fmtNameErr1 } from '../../lib/censor'
import { GameOptionFields } from './GameOptionFields'
import { SegaUsernameEditor, normalizeSegaUsername } from './SegaUsernameEditor'

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
  const copy = getAppTexts(locale)
  const [inGameName, setInGameName] = useState('')
  const [nameDirty, setNameDirty] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [nameErr1, setNameErr1] = useState<string | null>(null)

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
    const next = normalizeSegaUsername(inGameName)
    setNameErr1(null)
    setNameSaving(true)
    try {
      const r = await gameApi.changeName('mai2', next.trim())
      setInGameName(r.newName)
      setNameDirty(false)
    } catch (e) {
      setNameErr1(fmtNameErr1(e, copy.mai2Extra.renameAction))
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
      {nameErr1 ? <Text DANGEROUS_className="text-kumo-danger text-sm">{nameErr1}</Text> : null}

      <div className="flex max-w-xl flex-col gap-2">
        <SegaUsernameEditor
          label={copy.mai2Extra.inGameName}
          locale={locale}
          value={inGameName}
          onChange={(value) => {
            setInGameName(value)
            setNameDirty(true)
          }}
          saving={nameSaving}
          saveDisabled={!nameDirty || !inGameName.trim()}
          onSave={() => void saveName()}
        />
      </div>

      <GameOptionFields
        options={options}
        gameFilter={(g) => g === 'mai2'}
        locale={locale}
        onSet={onSet}
      />

      <Button variant="secondary" disabled={exporting} onClick={() => void doExport()}>
        {copy.mai2Extra.exportSave}
      </Button>
    </div>
  )
}
