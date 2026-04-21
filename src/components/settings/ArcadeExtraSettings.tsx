import { useEffect, useState } from 'react'
import { Button } from '@cloudflare/kumo/components/button'
import { Text } from '@cloudflare/kumo/components/text'
import * as gameApi from '../../api/game'
import { detailSet } from '../../api/settings'
import { getAppTexts } from '../../content/texts'
import { downloadJsonFile } from '../../lib/download'
import { fmtNameErr } from '../../lib/censor'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import type { GameOption } from '../../lib/types'
import { GameOptionFields } from './GameOptionFields'
import { SegaUsernameEditor, normalizeSegaUsername } from './SegaUsernameEditor'

type ArcadeGame = 'mai2' | 'ongeki'

type ArcadeConfig = {
  nameLabel: (copy: ReturnType<typeof getAppTexts>) => string
  renameAction: (copy: ReturnType<typeof getAppTexts>) => string
  saveName: (next: string) => Promise<string>
  saveMessage?: (copy: ReturnType<typeof getAppTexts>) => string
  exportLabel?: (copy: ReturnType<typeof getAppTexts>) => string
  exportSave?: (name: string, username: string) => Promise<void>
}

const ARCADE_CONFIG: Record<ArcadeGame, ArcadeConfig> = {
  mai2: {
    nameLabel: (copy) => copy.mai2Extra.inGameName,
    renameAction: (copy) => copy.mai2Extra.renameAction,
    saveName: async (next) => {
      const result = await gameApi.changeName('mai2', next.trim())
      return result.newName
    },
    exportLabel: (copy) => copy.mai2Extra.exportSave,
    exportSave: async (name, username) => {
      const data = await gameApi.exportGame('mai2')
      downloadJsonFile(`export-mai2-${name || username}.json`, data)
    },
  },
  ongeki: {
    nameLabel: (copy) => copy.ongekiExtra.inGameName,
    renameAction: (copy) => copy.ongekiExtra.renameAction,
    saveName: async (next) => {
      await detailSet('ongeki', 'userName', next)
      return next
    },
    saveMessage: (copy) => copy.common.saved,
  },
}

async function loadArcadeName(username: string, game: ArcadeGame) {
  const summary = await gameApi.userSummary(username, game)
  return typeof summary.name === 'string' ? summary.name : ''
}

export function ArcadeExtraSettings({
  game,
  username,
  options,
  locale,
  onSet,
  err,
}: {
  game: ArcadeGame
  username: string
  options: GameOption[]
  locale: SettingFieldLocale
  onSet: (key: string, value: string) => Promise<void>
  err: string | null
}) {
  const copy = getAppTexts(locale)
  const config = ARCADE_CONFIG[game]
  const [inGameName, setInGameName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [nameErr, setNameErr] = useState<string | null>(null)
  const [nameMsg, setNameMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    void loadArcadeName(username, game)
      .then((next) => {
        setInGameName(next)
        setSavedName(next)
      })
      .catch(() => {})
  }, [game, username])

  async function saveName() {
    const next = normalizeSegaUsername(inGameName)
    setNameErr(null)
    setNameMsg(null)
    setNameSaving(true)
    try {
      const saved = await config.saveName(next)
      setInGameName(saved)
      setSavedName(saved)
      setNameMsg(config.saveMessage ? config.saveMessage(copy) : null)
    } catch (e) {
      setNameErr(fmtNameErr(e, config.renameAction(copy)))
    } finally {
      setNameSaving(false)
    }
  }

  async function exportSave() {
    if (!config.exportSave) return
    setExporting(true)
    try {
      await config.exportSave(inGameName, username)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text DANGEROUS_className="text-kumo-danger text-sm">{err}</Text> : null}
      {nameErr ? <Text DANGEROUS_className="text-kumo-danger text-sm">{nameErr}</Text> : null}
      {nameMsg ? <Text DANGEROUS_className="text-kumo-success text-sm">{nameMsg}</Text> : null}

      <div className="flex max-w-xl flex-col gap-2">
        <SegaUsernameEditor
          label={config.nameLabel(copy)}
          locale={locale}
          value={inGameName}
          onChange={setInGameName}
          saving={nameSaving}
          saveDisabled={nameSaving || inGameName === savedName || !inGameName.trim()}
          onSave={() => void saveName()}
        />
      </div>

      <GameOptionFields
        options={options}
        gameFilter={(value) => value === game}
        locale={locale}
        onSet={onSet}
      />

      {config.exportLabel && config.exportSave ? (
        <Button variant="secondary" disabled={exporting} onClick={() => void exportSave()}>
          {config.exportLabel(copy)}
        </Button>
      ) : null}
    </div>
  )
}
