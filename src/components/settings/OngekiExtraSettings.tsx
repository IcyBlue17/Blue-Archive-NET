import { useEffect, useState } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import * as gameApi from '../../api/game'
import { detailSet } from '../../api/settings'
import { getAppTexts } from '../../content/texts'
import { fmtNameErr1 } from '../../lib/censor'
import type { SettingFieldLocale } from '../../lib/settingsFieldLabels'
import type { GameOption } from '../../lib/types'
import { GameOptionFields } from './GameOptionFields'
import { SegaUsernameEditor, normalizeSegaUsername } from './SegaUsernameEditor'

export function OngekiExtraSettings({
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
  const [savedName, setSavedName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameErr1, setNameErr1] = useState<string | null>(null)
  const [nameMsg1, setNameMsg1] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    void gameApi
      .userSummary(username, 'ongeki')
      .then((s) => {
        const next = typeof s.name === 'string' ? s.name : ''
        setInGameName(next)
        setSavedName(next)
      })
      .catch(() => {})
  }, [username])

  async function saveName() {
    const next = normalizeSegaUsername(inGameName)
    setNameErr1(null)
    setNameMsg1(null)
    setNameSaving(true)
    try {
      await detailSet('ongeki', 'userName', next)
      setInGameName(next)
      setSavedName(next)
      setNameMsg1(copy.common.saved)
    } catch (e) {
      setNameErr1(fmtNameErr1(e, copy.ongekiExtra.renameAction))
    } finally {
      setNameSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {err ? <Text DANGEROUS_className="text-kumo-danger text-sm">{err}</Text> : null}
      {nameErr1 ? <Text DANGEROUS_className="text-kumo-danger text-sm">{nameErr1}</Text> : null}
      {nameMsg1 ? <Text DANGEROUS_className="text-kumo-success text-sm">{nameMsg1}</Text> : null}

      <div className="flex max-w-xl flex-col gap-2">
        <SegaUsernameEditor
          label={copy.ongekiExtra.inGameName}
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
        gameFilter={(g) => g === 'ongeki'}
        locale={locale}
        onSet={onSet}
      />
    </div>
  )
}
