import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Link, useParams } from 'react-router-dom'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Button } from '@cloudflare/kumo/components/button'
import { GameSummaryPanel } from '../../components/game/GameSummaryPanel'
import { BuildInfoFooter } from '../../components/layout/buildinfo'
import * as userApi from '../../api/user'
import * as gameApi from '../../api/game'
import { qk } from '../../lib/query'
import type { AquaNetUser, GameName, GenericGameSummary } from '../../lib/types'
import { isLoggedIn } from '../../api/client'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'
import { useAppTexts } from '../../content/texts'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']

function pickPublicUser(raw: unknown): Partial<AquaNetUser> {
  if (typeof raw !== 'object' || raw === null) return {}
  return raw as Partial<AquaNetUser>
}

export function UserProfilePage() {
  const { username, game: gameParam } = useParams<{ username: string; game?: string }>()
  const { locale } = useI18n()
  const texts = useAppTexts()
  const toast = useKumoToastManager()
  const qc = useQueryClient()
  const loc = locale === 'en' ? 'en' : 'zh'
  const [game, setGame] = useState<GameName>((gameParam as GameName) || 'chu3')
  const [publicInfo, setPublicInfo] = useState<Partial<AquaNetUser> | null>(null)
  const [summary, setSummary] = useState<GenericGameSummary | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [rivalBusy, setRivalBusy] = useState(false)

  useEffect(() => {
    if (gameParam && GAMES.includes(gameParam as GameName)) setGame(gameParam as GameName)
  }, [gameParam])

  useEffect(() => {
    if (!username) return
    setErr(null)
    void userApi
      .userInfo(username)
      .then((d) => setPublicInfo(pickPublicUser(d)))
      .catch((e) => setErr(e instanceof Error ? e.message : texts.userProfile.notFound))
  }, [texts.userProfile.notFound, username])

  useEffect(() => {
    if (!username) return
    let cancelled = false
    setSummary(null)
    void gameApi
      .userSummary(username, game)
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [username, game])

  async function toggleRival() {
    if (!username || !summary || rivalBusy) return
    const isAdd = !summary.rival
    setRivalBusy(true)
    try {
      if (game === 'chu3') {
        if (isAdd) {
          const row = await gameApi.chu3RivalAdd(username)
          setSummary((old) => (old ? { ...old, rival: true, rivalExtId: row.rivalExtId } : old))
        } else {
          if (!summary.rivalExtId) throw new Error(texts.userProfile.missingRivalId)
          await gameApi.chu3RivalRemove(summary.rivalExtId)
          setSummary((old) => (old ? { ...old, rival: false, rivalExtId: null } : old))
        }
        await qc.invalidateQueries({ queryKey: qk.chu3Rivals })
      } else if (game === 'ongeki') {
        if (isAdd) {
          const row = await gameApi.ongekiRivalAdd(username)
          setSummary((old) => (old ? { ...old, rival: true, rivalExtId: row.rivalExtId } : old))
        } else {
          if (!summary.rivalExtId) throw new Error(texts.userProfile.missingRivalId)
          await gameApi.ongekiRivalRemove(summary.rivalExtId)
          setSummary((old) => (old ? { ...old, rival: false, rivalExtId: null } : old))
        }
        await qc.invalidateQueries({ queryKey: qk.ongekiRivals })
      } else {
        await gameApi.setRival(game, username, isAdd)
        setSummary((old) => (old ? { ...old, rival: isAdd } : old))
      }

      toast.add({
        title: isAdd ? texts.userProfile.friendAdded : texts.userProfile.friendRemoved,
        description: texts.userProfile.friendChangedDesc(username, isAdd),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : texts.common.requestFailed
      toast.add({
        title: texts.userProfile.friendActionFailed,
        description: msg,
        variant: 'error',
      })
    } finally {
      setRivalBusy(false)
    }
  }

  if (!username) return <Text>{texts.userProfile.invalidUser}</Text>

  const display = publicInfo?.displayName || publicInfo?.username || username
  const showRivalBtn =
    isLoggedIn() &&
    typeof summary?.rival === 'boolean' &&
    (game === 'mai2' || game === 'chu3' || game === 'ongeki')
  const rivalText =
    game === 'chu3' || game === 'ongeki'
      ? summary?.rival
        ? texts.userProfile.removeFriend
        : texts.userProfile.addFriend
      : summary?.rival
        ? texts.userProfile.removeRival
        : texts.userProfile.addRival

  return (
    <div className="bg-kumo-surface flex min-h-screen flex-col">
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <Link to="/home">
            <Text DANGEROUS_className="text-kumo-brand mb-4 inline-block">{texts.nav.home}</Text>
          </Link>
          <LayerCard className="p-6">
            <LayerCard.Primary>{display}</LayerCard.Primary>
            <Text DANGEROUS_className="text-kumo-subtle mt-1">@{username}</Text>
            {publicInfo?.profileBio ? (
              <Text DANGEROUS_className="text-kumo-default mt-3 block text-sm">{publicInfo.profileBio}</Text>
            ) : null}
            {publicInfo?.country ? (
              <Text DANGEROUS_className="text-kumo-subtle mt-2 block text-xs">
                {publicInfo.country}
                {publicInfo.region ? ` · ${publicInfo.region}` : ''}
              </Text>
            ) : null}
            {err ? <Text DANGEROUS_className="text-kumo-danger mt-2">{err}</Text> : null}
          </LayerCard>
          <div className="mt-6">
            <Tabs
              variant="underline"
              tabs={GAMES.map((g) => ({ value: g, label: gameTitle(g, loc) }))}
              value={game}
              onValueChange={(v) => setGame(v as GameName)}
            />
          </div>
          <div className="mt-4">
            <GameSummaryPanel game={game} summary={summary} title={texts.userProfile.gameDataTitle(game)} />
          </div>
          <div className="mt-4">
            {showRivalBtn ? (
              <Button variant="secondary" size="sm" onClick={toggleRival} disabled={rivalBusy}>
                {rivalBusy ? texts.common.working : rivalText}
              </Button>
            ) : null}
          </div>
        </div>
      </main>
      <BuildInfoFooter className="px-6 pb-6" />
    </div>
  )
}
