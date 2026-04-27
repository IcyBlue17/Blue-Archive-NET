import { useMemo } from 'react'
import { Text } from '@cloudflare/kumo/components/text'
import { LayerCard } from '@cloudflare/kumo/components/layer-card'
import type { GameName } from '../../lib/types'
import { parseComposition, type MusicMetaLite } from '../../lib/scoring'
import { imgCross } from '../../lib/imgSign'
import { useAppTexts } from '../../content/texts'

function CompGrid({
  title,
  comp,
  allMusics,
  game,
}: {
  title: string
  comp: string
  allMusics: Record<string, MusicMetaLite>
  game: GameName
}) {
  const items = useMemo(() => {
    if (!comp?.trim()) return []
    return comp
      .split(',')
      .filter((it) => it && it.split(':')[0] !== '0')
      .map((it) => parseComposition(it, allMusics, game))
  }, [comp, allMusics, game])

  if (!items.length) return null

  return (
    <div className="mt-6">
      <Text DANGEROUS_className="mb-3 font-semibold" size="sm">
        {title}
      </Text>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <div
            key={`${p.musicId}-${p.diffId}-${i}`}
            className="bg-kumo-recessed border-kumo-line flex gap-3 rounded-lg border p-3"
          >
            <img
              src={p.img}
              crossOrigin={imgCross(p.img)}
              alt=""
              className="h-14 w-14 shrink-0 rounded object-cover"
              onError={(e) => {
                const el = e.currentTarget
                el.style.visibility = 'hidden'
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.name ?? `#${p.musicId}`}</div>
              <div className="text-kumo-subtle mt-1 flex flex-wrap gap-2 text-xs">
                <span>Lv {p.difficulty ?? '—'}</span>
                <span className="text-kumo-brand">{p.rank}</span>
                <span>{(p.score / 10000).toFixed(4)}%</span>
                {p.ratingChange != null ? <span>Δ {p.ratingChange}</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RatingCompositionSection({
  game,
  ratingComposition,
  allMusics,
}: {
  game: GameName
  ratingComposition: Record<string, unknown> | undefined | null
  allMusics: Record<string, MusicMetaLite>
}) {
  const texts = useAppTexts()
  const blocks = useMemo(() => {
    const c = ratingComposition ?? {}
    const out: { title: string; key: string; raw: string }[] = []
    if (game === 'chu3') {
      if (c.best30) out.push({ title: texts.gamesPage.best30, key: 'b30', raw: String(c.best30) })
      if (c.new) out.push({ title: texts.gamesPage.new20, key: 'n20', raw: String(c.new) })
      else if (c.recent10) out.push({ title: texts.gamesPage.recent10, key: 'r10', raw: String(c.recent10) })
    } else if (game === 'mai2') {
      if (c.best35) out.push({ title: texts.gamesPage.best35, key: 'b35', raw: String(c.best35) })
      if (c.best15) out.push({ title: texts.gamesPage.best15, key: 'b15', raw: String(c.best15) })
    } else if (game === 'ongeki') {
      if (c.best30) out.push({ title: texts.gamesPage.best30, key: 'b30', raw: String(c.best30) })
      if (c.best15) out.push({ title: texts.gamesPage.best15, key: 'b15', raw: String(c.best15) })
      if (c.recent10) out.push({ title: texts.gamesPage.recent10, key: 'r10', raw: String(c.recent10) })
    }
    return out
  }, [game, ratingComposition, texts])

  if (!blocks.length) return null

  return (
    <LayerCard className="mt-6 p-4">
      <LayerCard.Secondary>{texts.gamesPage.ratingComposition}</LayerCard.Secondary>
      {blocks.map((b) => (
        <CompGrid key={b.key} title={b.title} comp={b.raw} allMusics={allMusics} game={game} />
      ))}
      {game === 'chu3' ? (
        <Text DANGEROUS_className="mt-4 text-kumo-subtle" size="sm">
          {texts.gamesPage.chu3RatingNotice}
        </Text>
      ) : null}
    </LayerCard>
  )
}
