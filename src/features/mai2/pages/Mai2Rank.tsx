import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Collapse, InputNumber, Select } from 'antd'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/toast'
import * as gameApi from '@/api/game'
import { detailSet } from '@/api/settings'
import { useAuth } from '@/hooks/useAuth'
import { useAppTexts } from '@/content/texts'
import type { Mai2FriendBattle, Mai2UserUdemae } from '@/lib/types'

// 段位認定 dan ids (userData.courseRank); 11 is unused by maimai DX.
const COURSE_RANKS: { id: number; name: string }[] = [
  { id: 0, name: '初心者' },
  { id: 1, name: '初段' },
  { id: 2, name: '二段' },
  { id: 3, name: '三段' },
  { id: 4, name: '四段' },
  { id: 5, name: '五段' },
  { id: 6, name: '六段' },
  { id: 7, name: '七段' },
  { id: 8, name: '八段' },
  { id: 9, name: '九段' },
  { id: 10, name: '十段' },
  { id: 12, name: '真初段' },
  { id: 13, name: '真二段' },
  { id: 14, name: '真三段' },
  { id: 15, name: '真四段' },
  { id: 16, name: '真五段' },
  { id: 17, name: '真六段' },
  { id: 18, name: '真七段' },
  { id: 19, name: '真八段' },
  { id: 20, name: '真九段' },
  { id: 21, name: '真十段' },
  { id: 22, name: '真皆伝' },
  { id: 23, name: '裏皆伝' },
]

// 友人对战 class ids (userData.classRank): 0 = B5 .. 25 = LEGEND.
const CLASS_RANK_NAMES = [
  'B5', 'B4', 'B3', 'B2', 'B1',
  'A5', 'A4', 'A3', 'A2', 'A1',
  'S5', 'S4', 'S3', 'S2', 'S1',
  'SS5', 'SS4', 'SS3', 'SS2', 'SS1',
  'SSS5', 'SSS4', 'SSS3', 'SSS2', 'SSS1',
  'LEGEND',
]

const UDEMAE_FIELDS: (keyof Mai2UserUdemae)[] = [
  'rate', 'maxRate', 'classValue', 'maxClassValue',
  'winNum', 'loseNum', 'totalWinNum', 'totalLoseNum', 'maxWinNum', 'maxLoseNum',
  'npcWinNum', 'npcLoseNum', 'npcTotalWinNum', 'npcTotalLoseNum', 'npcMaxWinNum', 'npcMaxLoseNum',
]

// The game derives the class from classValue on every play (UserUdemae.SetClassData).
function classOfValue(classValue: number) {
  return Math.min(Math.floor(classValue / 10000), CLASS_RANK_NAMES.length - 1)
}

function danName(id: number) {
  return COURSE_RANKS.find((r) => r.id === id)?.name ?? `? (${id})`
}

function classRankName(id: number) {
  return CLASS_RANK_NAMES[id] ?? `? (${id})`
}

export function Mai2RankPage() {
  const texts = useAppTexts()
  const toast = useToast()
  const { user } = useAuth()
  const username = user?.username ?? ''

  const [dan, setDan] = useState<number | null>(null)
  const [danSaving, setDanSaving] = useState(false)
  const [classRank, setClassRank] = useState<number | null>(null)
  const [counters, setCounters] = useState<Partial<Record<keyof Mai2UserUdemae, number | null>>>({})
  const [battleSaving, setBattleSaving] = useState(false)

  const detailQuery = useQuery<Record<string, unknown>>({
    queryKey: ['mai2-rank-detail', username],
    enabled: !!username,
    queryFn: () => gameApi.mai2UserDetail(username),
  })

  const battleQuery = useQuery<Mai2FriendBattle>({
    queryKey: ['mai2-friend-battle'],
    queryFn: () => gameApi.mai2FriendBattle(),
  })

  useEffect(() => {
    const raw = detailQuery.data?.courseRank
    if (typeof raw === 'number' && COURSE_RANKS.some((r) => r.id === raw)) setDan(raw)
    else if (raw != null) setDan(null)
  }, [detailQuery.data])

  useEffect(() => {
    const data = battleQuery.data
    if (!data) return
    const rank = data.classRank
    setClassRank(rank >= 0 && rank < CLASS_RANK_NAMES.length ? rank : null)
    const next: typeof counters = {}
    for (const key of UDEMAE_FIELDS) {
      const v = data.udemae?.[key]
      next[key] = typeof v === 'number' ? v : null
    }
    setCounters(next)
  }, [battleQuery.data])

  const currentDan = typeof detailQuery.data?.courseRank === 'number' ? detailQuery.data.courseRank : null
  const currentClass = battleQuery.data?.classRank ?? null

  function errToast(err: unknown) {
    toast.add({
      title: texts.mai2RankPage.saveFailed,
      description: err instanceof Error ? err.message : texts.common.requestFailed,
      variant: 'error',
    })
  }

  async function saveDan() {
    if (dan == null) return
    setDanSaving(true)
    try {
      await detailSet('mai2', 'courseRank', dan)
      toast.add({ title: texts.mai2RankPage.saved, variant: 'success' })
      await detailQuery.refetch()
    } catch (e) {
      errToast(e)
    } finally {
      setDanSaving(false)
    }
  }

  async function saveBattle() {
    const body: Record<string, number> = {}
    if (classRank != null && classRank !== currentClass) body.classRank = classRank
    for (const key of UDEMAE_FIELDS) {
      const next = counters[key]
      const orig = battleQuery.data?.udemae?.[key]
      if (next != null && next !== orig) body[key] = next
    }
    if (Object.keys(body).length === 0) {
      toast.add({ title: texts.mai2RankPage.unchanged, variant: 'info' })
      return
    }
    setBattleSaving(true)
    try {
      const res = await gameApi.mai2FriendBattleSet(body)
      setClassRank(res.classRank)
      toast.add({ title: texts.mai2RankPage.saved, variant: 'success' })
      await battleQuery.refetch()
    } catch (e) {
      errToast(e)
    } finally {
      setBattleSaving(false)
    }
  }

  const loadErr =
    (detailQuery.error instanceof Error && detailQuery.error.message) ||
    (battleQuery.error instanceof Error && battleQuery.error.message) ||
    null

  return (
    <div>
      <PageHeader
        title={texts.nav.mai2Rank}
        crumbs={[{ label: texts.nav.dashboard, href: '/home' }, { label: texts.nav.mai2Rank }]}
      />

      {loadErr ? (
        <SectionCard title={<>{texts.common.prompt}</>} className="mb-4">
          <p className="text-app-subtle mt-2 text-sm">{loadErr}</p>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title={<>{texts.mai2RankPage.danTitle}</>}>
          {detailQuery.isPending ? (
            <SkeletonBox className="h-10 w-full rounded-lg" />
          ) : (
            <>
              <Text className="text-app-subtle block text-sm">
                {currentDan == null ? texts.common.empty : texts.mai2RankPage.danCurrent(danName(currentDan))}
              </Text>
              <div className="mt-3 flex gap-3">
                <Select
                  className="min-w-40 flex-1"
                  value={dan}
                  onChange={(v) => setDan(v)}
                  options={COURSE_RANKS.map((r) => ({ value: r.id, label: r.name }))}
                />
                <Button disabled={dan == null || dan === currentDan || danSaving} onClick={() => void saveDan()}>
                  {texts.mai2RankPage.danSave}
                </Button>
              </div>
              <Text className="text-app-subtle mt-3 block text-sm">{texts.mai2RankPage.danHint}</Text>
            </>
          )}
        </SectionCard>

        <SectionCard title={<>{texts.mai2RankPage.friendBattleTitle}</>}>
          {battleQuery.isPending ? (
            <SkeletonBox className="h-10 w-full rounded-lg" />
          ) : (
            <>
              <Text className="text-app-subtle block text-sm">
                {currentClass == null ? texts.common.empty : texts.mai2RankPage.classCurrent(classRankName(currentClass))}
              </Text>
              <div className="mt-3 flex gap-3">
                <Select
                  className="min-w-40 flex-1"
                  value={classRank}
                  onChange={(v) => {
                    setClassRank(v)
                    // Keep classValue in step: the game rewrites classRank from it on every play.
                    const cur = counters.classValue ?? battleQuery.data?.udemae?.classValue ?? 0
                    if (v != null && classOfValue(cur) !== v) {
                      setCounters((prev) => ({ ...prev, classValue: v * 10000 }))
                    }
                  }}
                  options={CLASS_RANK_NAMES.map((name, i) => ({ value: i, label: name }))}
                />
              </div>
              <Text className="text-app-subtle mt-3 block text-sm">{texts.mai2RankPage.friendBattleHint}</Text>

              <Collapse
                className="mt-4"
                items={[
                  {
                    key: 'udemae',
                    label: texts.mai2RankPage.udemaeAdvanced,
                    children: (
                      <>
                        <Text className="text-app-subtle mb-3 block text-sm">{texts.mai2RankPage.udemaeHint}</Text>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {UDEMAE_FIELDS.map((key) => (
                            <label key={key} className="flex flex-col gap-1">
                              <Text className="text-xs text-app-subtle">
                                {texts.mai2RankPage.udemaeFields[key] ?? key}
                              </Text>
                              <InputNumber
                                min={0}
                                className="w-full"
                                value={counters[key] ?? null}
                                onChange={(v) => {
                                  setCounters((prev) => ({
                                    ...prev,
                                    [key]: v == null ? null : Math.max(0, Math.floor(v)),
                                  }))
                                  // Typing a class value picks the class it stands for.
                                  if (key === 'classValue' && v != null) setClassRank(classOfValue(v))
                                }}
                                placeholder={String(battleQuery.data?.udemae?.[key] ?? '')}
                              />
                            </label>
                          ))}
                        </div>
                      </>
                    ),
                  },
                ]}
              />

              <div className="mt-4">
                <Button type="primary" disabled={battleSaving} onClick={() => void saveBattle()}>
                  {texts.mai2RankPage.counterSave}
                </Button>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
