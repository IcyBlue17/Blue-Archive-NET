import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import { Tabs } from '@cloudflare/kumo/components/tabs'
import { Button } from '@cloudflare/kumo/components/button'
import { GameSummaryPanel } from '../../components/game/GameSummaryPanel'
import * as userApi from '../../api/user'
import * as gameApi from '../../api/game'
import type { AquaNetUser, GameName, GenericGameSummary } from '../../lib/types'
import { isLoggedIn } from '../../api/client'
import { gameTitle } from '../../lib/gameTitles'
import { useI18n } from '../../lib/i18n'

const GAMES: GameName[] = ['chu3', 'mai2', 'ongeki', 'wacca']

function pickPublicUser(raw: unknown): Partial<AquaNetUser> {
  if (typeof raw !== 'object' || raw === null) return {}
  return raw as Partial<AquaNetUser>
}

export function UserProfilePage() {
  const { username, game: gameParam } = useParams<{ username: string; game?: string }>()
  const { t, locale } = useI18n()
  const loc = locale === 'en' ? 'en' : 'zh'
  const [game, setGame] = useState<GameName>((gameParam as GameName) || 'chu3')
  const [publicInfo, setPublicInfo] = useState<Partial<AquaNetUser> | null>(null)
  const [summary, setSummary] = useState<GenericGameSummary | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (gameParam && GAMES.includes(gameParam as GameName)) setGame(gameParam as GameName)
  }, [gameParam])

  useEffect(() => {
    if (!username) return
    setErr(null)
    void userApi
      .userInfo(username)
      .then((d) => setPublicInfo(pickPublicUser(d)))
      .catch((e) => setErr(e instanceof Error ? e.message : 'Not found'))
  }, [username])

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

  async function addRival() {
    if (!username) return
    try {
      await gameApi.setRival(game, username, true)
    } catch {
      /* ignore */
    }
  }

  if (!username) return <Text>Invalid user</Text>

  const display = publicInfo?.displayName || publicInfo?.username || username

  return (
    <div className="bg-kumo-background min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/home">
          <Text DANGEROUS_className="text-kumo-accent mb-4 inline-block">{t('home')}</Text>
        </Link>
        <LayerCard className="p-6">
          <LayerCard.Primary>{display}</LayerCard.Primary>
          <Text DANGEROUS_className="text-kumo-subtle mt-1">@{username}</Text>
          {publicInfo?.profileBio ? (
            <Text DANGEROUS_className="text-kumo-text mt-3 block text-sm">{publicInfo.profileBio}</Text>
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
          <GameSummaryPanel game={game} summary={summary} title={`${game} · 数据`} />
        </div>
        <div className="mt-4">
          {isLoggedIn() ? (
            <Button variant="secondary" size="sm" onClick={addRival}>
              添加为劲敌（支持的游戏）
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
