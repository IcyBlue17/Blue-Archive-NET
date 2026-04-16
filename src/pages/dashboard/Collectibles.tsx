import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useKumoToastManager } from '@cloudflare/kumo'
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Switch } from '@cloudflare/kumo/components/switch'
import { Text } from '@cloudflare/kumo/components/text'
import { PageHeader } from '../../components/common/PageHeader'
import { SkeletonBox } from '../../components/common/Skeleton'
import * as dataApi from '../../api/data'
import * as gameApi from '../../api/game'
import { detailSet } from '../../api/settings'
import { qk } from '../../lib/query'
import {
  buildChu3CatalogOptions,
  bundleToLookups,
  type Chu3AllItems,
  chu3CollectibleHasImage,
  chu3CollectibleImageUrl,
  loadChu3CatalogBundle,
  loadChu3StageCatalog,
  type Chu3CatalogBundle,
  type Chu3NameLookups,
  type Chu3StageJsonEntry,
} from '../../lib/chu3Assets'
import { imgCross1 } from '../../lib/imgSign'
import {
  buildChu3AppearanceSelectRows,
  CHU3_APPEARANCE_FIELD_ORDER,
  CHU3_FIELD_ALL_ITEMS_KEY,
  withEquippedIfMissing,
  type Chu3UserItem,
  type Chu3UserboxSelectRow,
} from '../../lib/chu3Userbox'
import { useAppTexts } from '../../content/texts'

const UNLOCK_ALL_STORAGE_KEY = 'chu3-collectibles-unlock-all'

/** 本页不展示边框（网页侧没必要改） */
const COLLECTIBLES_FIELD_ORDER = CHU3_APPEARANCE_FIELD_ORDER.filter((f) => f !== 'frameId')

/** 无 webp 预览：不占大图位、不显示「无预览图」 */
const TEXT_ONLY_PREVIEW_FIELDS = new Set([
  'trophyId',
  'trophyIdSub1',
  'trophyIdSub2',
])

function numFromUser(u: Record<string, unknown>, field: string): number {
  const v = u[field]
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v !== '') return parseInt(v, 10) || 0
  return 0
}

function buildAllCollectibleRows(
  items: Chu3UserItem[],
  charIds: number[],
  equippedChar: number,
  allItems: Chu3AllItems,
  u: Record<string, unknown>,
): Chu3UserboxSelectRow[] {
  const base = buildChu3AppearanceSelectRows(items, charIds, equippedChar, allItems)
  const byField = new Map(base.map((r) => [r.field, r]))
  const out: Chu3UserboxSelectRow[] = []
  for (const f of COLLECTIBLES_FIELD_ORDER) {
    const key = CHU3_FIELD_ALL_ITEMS_KEY[f]
    let row = byField.get(f)
    if (!row) {
      row = { field: f, allItemsKey: key, options: [] }
    }
    row = withEquippedIfMissing(row, numFromUser(u, f), allItems)
    out.push(row)
  }
  return out
}

function resolveCollectibleName(
  field: string,
  itemId: number,
  allItems: Chu3AllItems,
  lookups: Chu3NameLookups | null,
): string {
  if (itemId < 0) return '—'
  if (itemId === 0 && field !== 'characterId') return '—'
  const key = CHU3_FIELD_ALL_ITEMS_KEY[field as keyof typeof CHU3_FIELD_ALL_ITEMS_KEY]
  const fromAll = key ? allItems[key]?.[String(itemId)]?.name : undefined

  let fromJson: string | undefined
  if (lookups) {
    switch (field) {
      case 'nameplateId':
        fromJson = lookups.namePlate.get(itemId)
        break
      case 'trophyId':
      case 'trophyIdSub1':
      case 'trophyIdSub2':
        fromJson = lookups.trophy.get(itemId)
        break
      case 'characterId':
        fromJson = lookups.character.get(itemId)
        break
      case 'mapIconId':
        fromJson = lookups.mapIcon.get(itemId)
        break
      case 'voiceId':
        fromJson = lookups.systemVoice.get(itemId)
        break
      case 'avatarWear':
      case 'avatarHead':
      case 'avatarFace':
      case 'avatarSkin':
      case 'avatarItem':
      case 'avatarFront':
      case 'avatarBack':
        fromJson = lookups.avatar.get(itemId)
        break
      default:
        break
    }
  }
  return fromJson ?? fromAll ?? `(unknown ${itemId})`
}

function draftFromUser(u: Record<string, unknown>): Record<string, number> {
  const d: Record<string, number> = {}
  for (const f of COLLECTIBLES_FIELD_ORDER) {
    d[f] = numFromUser(u, f)
  }
  return d
}

function stageImgPath1(raw: unknown): string | null {
  const s1 = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim()
  if (!s1) return null
  if (/^https?:\/\//i.test(s1)) return s1
  const path1 = s1.replace(/^\/+/, '')
  if (!path1) return null
  return path1.includes('/') ? path1 : `stage/${path1}`
}

function mergeStageItems1(
  allItems: Chu3AllItems,
  stageRows: Chu3StageJsonEntry[],
): Chu3AllItems {
  if (!stageRows.length) return allItems
  const stage1 = { ...(allItems.stage ?? {}) }
  let dirty1 = !allItems.stage
  for (const row1 of stageRows) {
    const rawId1 = row1.stageId ?? row1.id
    const id1 = typeof rawId1 === 'number' ? rawId1 : parseInt(String(rawId1), 10)
    if (!Number.isFinite(id1) || id1 <= 0) continue
    const old1 = stage1[String(id1)]
    const oldName1 = typeof old1?.name === 'string' ? old1.name.trim() : ''
    const oldImg1 = stageImgPath1(old1?.imagePath ?? old1?.imageFile)
    const name1 = typeof row1.name === 'string' && row1.name.trim() ? row1.name.trim() : oldName1 || `Stage ${id1}`
    const imagePath1 = stageImgPath1(row1.imagePath ?? row1.imageFile) ?? oldImg1
    const next1 = { ...old1 }
    let rowDirty1 = false
    if (next1.name !== name1) {
      next1.name = name1
      rowDirty1 = true
    }
    if ((next1.imagePath ?? null) !== imagePath1) {
      next1.imagePath = imagePath1
      rowDirty1 = true
    }
    if (!rowDirty1) continue
    stage1[String(id1)] = next1
    dirty1 = true
  }
  return dirty1 ? { ...allItems, stage: stage1 } : allItems
}

/** 0-based page indices + ellipsis markers for pagination bar */
function buildPaginationItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 1) return []
  if (total <= 9) return Array.from({ length: total }, (_, i) => i)
  const want = new Set<number>()
  want.add(0)
  want.add(total - 1)
  for (let d = -2; d <= 2; d++) {
    const p = current + d
    if (p >= 0 && p < total) want.add(p)
  }
  const sorted = [...want].sort((a, b) => a - b)
  const out: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!
    if (i > 0 && cur > sorted[i - 1]! + 1) out.push('ellipsis')
    out.push(cur)
  }
  return out
}

function isWidePreviewField1(field: string): boolean {
  return field === 'nameplateId' || field === 'stageId'
}

type Chu3CollectibleLoad = {
  lockedRows: Chu3UserboxSelectRow[]
  catalogBundle: Chu3CatalogBundle
  user: Record<string, unknown>
  draft: Record<string, number>
  allItems: Chu3AllItems
  lookups: Chu3NameLookups
  ownedCharacters: number[]
  ownedCharacterLvs: Record<number, number>
}

type Chu3CharacterMeta = {
  name?: string
  worksId?: number | string
  worksName?: string
  illustratorId?: number | string
  illustratorName?: string
  rareType?: number | string
  ranking?: boolean | number | string
  defaultImageId?: number | string
  defaultImageName?: string
  addImages?: string
  addImageList?: Array<Record<string, unknown>>
  rankRewards?: Array<Record<string, unknown>>
  [key: string]: unknown
}

function text1(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
}

function cleanText1(v: unknown): string {
  const s1 = text1(v)
  if (!s1) return ''
  if (s1 === 'Invalid' || s1 === '-1' || s1 === 'null' || s1 === 'undefined') return ''
  return s1
}

function rewardText1(v: unknown): string {
  const s1 = cleanText1(v)
  if (!s1) return ''
  if (s1.includes('[OTHER]')) return ''
  if (s1.includes('限界突破の証')) return ''
  return s1
}

function charaMetaMap1(allItems: Chu3AllItems): Record<number, Chu3CharacterMeta> {
  const raw1 = allItems.chara as Record<string, Chu3CharacterMeta> | undefined
  const out1: Record<number, Chu3CharacterMeta> = {}
  if (!raw1) return out1
  for (const [id1, row1] of Object.entries(raw1)) {
    const num1 = parseInt(id1, 10)
    if (!Number.isNaN(num1)) out1[num1] = row1
  }
  return out1
}

export function CollectiblesPage() {
  const texts = useAppTexts()
  const toast = useKumoToastManager()
  const [unlockAll, setUnlockAll] = useState(() => localStorage.getItem(UNLOCK_ALL_STORAGE_KEY) === '1')
  const [lockedRows, setLockedRows] = useState<Chu3UserboxSelectRow[]>([])
  const [catalogBundle, setCatalogBundle] = useState<Chu3CatalogBundle | null>(null)
  const [user, setUser] = useState<Record<string, unknown>>({})
  const [draft, setDraft] = useState<Record<string, number>>(() => draftFromUser({}))
  const [allItems, setAllItems] = useState<Chu3AllItems>({})
  const [lookups, setLookups] = useState<Chu3NameLookups | null>(null)
  const [ownedCharacters, setOwnedCharacters] = useState<number[]>([])
  const [ownedCharacterLvs, setOwnedCharacterLvs] = useState<Record<number, number>>({})
  const [err, setErr] = useState<string | null>(null)
  const [modalField, setModalField] = useState<string | null>(null)
  const [modalPage, setModalPage] = useState(0)
  const [modalSearch, setModalSearch] = useState('')
  const [charaWorksFilter, setCharaWorksFilter] = useState('')
  const [charaLv, setCharaLv] = useState('1')
  const [pickedCharaId, setPickedCharaId] = useState<number | null>(null)
  const [unlockingCharaId, setUnlockingCharaId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const keepDraftRef = useRef(false)
  const pendingCharaIdRef = useRef<number | null>(null)

  const deferredSearch = useDeferredValue(modalSearch.trim().toLowerCase())

  const label = useCallback(
    (field: string) => texts.collectibles.fieldLabels[field as keyof typeof texts.collectibles.fieldLabels] ?? field,
    [texts],
  )

  const effectiveUser = useMemo(() => {
    const o: Record<string, unknown> = { ...user }
    for (const f of COLLECTIBLES_FIELD_ORDER) {
      o[f] = draft[f]
    }
    return o
  }, [user, draft])

  const hasDirty = useMemo(
    () => COLLECTIBLES_FIELD_ORDER.some((f) => numFromUser(user, f) !== draft[f]),
    [user, draft],
  )

  const displayRows = useMemo((): Chu3UserboxSelectRow[] => {
    const base: Chu3UserboxSelectRow[] =
      unlockAll && catalogBundle
        ? COLLECTIBLES_FIELD_ORDER.map((f) => {
            const key = CHU3_FIELD_ALL_ITEMS_KEY[f]
            const options = buildChu3CatalogOptions(f, catalogBundle, allItems)
            let row: Chu3UserboxSelectRow = { field: f, allItemsKey: key, options }
            row = withEquippedIfMissing(row, numFromUser(effectiveUser, f), allItems)
            return row
          })
        : lockedRows
    return base.map((row) =>
      withEquippedIfMissing(row, numFromUser(effectiveUser, row.field), allItems),
    )
  }, [unlockAll, catalogBundle, lockedRows, allItems, effectiveUser])

  const loadQuery = useQuery<Chu3CollectibleLoad>({
    queryKey: qk.collectiblesChu3,
    placeholderData: (old) => old,
    queryFn: async () => {
      const [box, allRaw, bundle, stageRows] = await Promise.all([
        gameApi.userBox(),
        dataApi.allItems('chu3'),
        loadChu3CatalogBundle(),
        loadChu3StageCatalog(),
      ])
      const items = (box.items ?? []) as Chu3UserItem[]
      const u = (box.user ?? {}) as Record<string, unknown>
      const rawChars = (box as { characters?: unknown }).characters
      const rawCharaRows = (box as { characterRows?: unknown }).characterRows
      const charIds: number[] = Array.isArray(rawChars)
        ? rawChars
            .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
            .filter((n) => !Number.isNaN(n))
        : []
      const charaLvs: Record<number, number> = {}
      if (Array.isArray(rawCharaRows)) {
        for (const one of rawCharaRows) {
          const row = one as { characterId?: unknown; level?: unknown }
          const charaId = typeof row.characterId === 'number' ? row.characterId : parseInt(String(row.characterId), 10)
          const lv = typeof row.level === 'number' ? row.level : parseInt(String(row.level), 10)
          if (!Number.isNaN(charaId) && charaId > 0 && !Number.isNaN(lv)) {
            charaLvs[charaId] = lv
          }
        }
      }
      const equippedChar = numFromUser(u, 'characterId')
      const ai0 = allRaw as Chu3AllItems
      const ai = mergeStageItems1(ai0, stageRows)
      return {
        allItems: ai,
        user: u,
        catalogBundle: bundle,
        lookups: bundleToLookups(bundle),
        lockedRows: buildAllCollectibleRows(items, charIds, equippedChar, ai, u),
        draft: draftFromUser(u),
        ownedCharacters: charIds,
        ownedCharacterLvs: charaLvs,
      }
    },
  })

  useEffect(() => {
    if (!loadQuery.data) return
    setAllItems(loadQuery.data.allItems)
    setUser(loadQuery.data.user)
    setCatalogBundle(loadQuery.data.catalogBundle)
    setLookups(loadQuery.data.lookups)
    setOwnedCharacters(loadQuery.data.ownedCharacters)
    setOwnedCharacterLvs(loadQuery.data.ownedCharacterLvs)
    setLockedRows(loadQuery.data.lockedRows)
    setDraft((oldDraft) => {
      if (!keepDraftRef.current) return loadQuery.data.draft
      const nextDraft = { ...loadQuery.data.draft, ...oldDraft }
      if (pendingCharaIdRef.current != null) nextDraft.characterId = pendingCharaIdRef.current
      keepDraftRef.current = false
      pendingCharaIdRef.current = null
      return nextDraft
    })
    pendingCharaIdRef.current = null
  }, [loadQuery.data])

  const ownedCharacterSet = useMemo(() => new Set(ownedCharacters), [ownedCharacters])
  const pickedCharaLv = pickedCharaId != null ? (ownedCharacterLvs[pickedCharaId] ?? 1) : 1
  const pickedCharaOwned = pickedCharaId != null && ownedCharacterSet.has(pickedCharaId)
  const pickedCharaName =
    pickedCharaId != null
      ? resolveCollectibleName('characterId', pickedCharaId, allItems, lookups)
      : null

  const activeRow = useMemo(
    () => (modalField ? displayRows.find((r) => r.field === modalField) ?? null : null),
    [displayRows, modalField],
  )

  const pickerOptionsFull = activeRow?.options ?? []
  const charaMetaMap = useMemo(() => charaMetaMap1(allItems), [allItems])
  const selectedCharaMeta = pickedCharaId != null ? charaMetaMap[pickedCharaId] ?? null : null
  const validAddImages1 = useMemo(() => {
    if (!Array.isArray(selectedCharaMeta?.addImageList)) return [] as string[]
    return selectedCharaMeta.addImageList
      .map((one1) => cleanText1(one1.charaName) || cleanText1(one1.imageName) || cleanText1(one1.imageId))
      .filter((one1) => !!one1)
  }, [selectedCharaMeta])
  const validRankRewards1 = useMemo(() => {
    if (!Array.isArray(selectedCharaMeta?.rankRewards)) return [] as Array<{ lv: string; reward: string }>
    return selectedCharaMeta.rankRewards
      .map((one1) => ({
        lv: cleanText1(one1.index),
        reward: rewardText1(one1.rewardSkillSeedName),
      }))
      .filter((one1) => !!one1.reward)
  }, [selectedCharaMeta])
  const charaWorksList = useMemo(() => {
    if (activeRow?.field !== 'characterId') return [] as string[]
    const set1 = new Set<string>()
    Object.values(charaMetaMap).forEach((meta1) => {
      const works1 = cleanText1(meta1?.worksName)
      if (works1) set1.add(works1)
    })
    return [...set1].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [activeRow?.field, charaMetaMap])
  const filteredOptions = useMemo(() => {
    return pickerOptionsFull.filter((o) => {
      const charaMeta1 = activeRow?.field === 'characterId' ? charaMetaMap[o.itemId] : null
      if (activeRow?.field === 'characterId') {
        if (charaWorksFilter && cleanText1(charaMeta1?.worksName) !== charaWorksFilter) return false
      }
      if (!deferredSearch) return true
      const extra1 =
        activeRow?.field === 'characterId'
          ? `${cleanText1(charaMeta1?.worksName)} ${cleanText1(charaMeta1?.illustratorName)} ${cleanText1(charaMeta1?.defaultImageName)}`
          : ''
      return (
        o.name.toLowerCase().includes(deferredSearch) ||
        String(o.itemId).includes(deferredSearch) ||
        extra1.toLowerCase().includes(deferredSearch)
      )
    })
  }, [pickerOptionsFull, deferredSearch, activeRow?.field, charaMetaMap, charaWorksFilter])

  const pageSize =
    activeRow && chu3CollectibleHasImage(activeRow.field)
      ? 12
      : activeRow && ['trophyId', 'trophyIdSub1', 'trophyIdSub2'].includes(activeRow.field)
        ? 24
        : 20

  const totalPages = Math.max(1, Math.ceil(filteredOptions.length / pageSize))
  const safePage = Math.min(modalPage, totalPages - 1)
  const pageSlice = filteredOptions.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const equippedId = modalField ? numFromUser(effectiveUser, modalField) : 0

  useEffect(() => {
    setModalPage(0)
  }, [modalField, deferredSearch, pageSize])

  useEffect(() => {
    if (!modalField) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [modalField])

  useEffect(() => {
    if (!modalField) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setModalField(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalField])

  function openModal(field: string) {
    setModalSearch('')
    setModalPage(0)
    setCharaWorksFilter('')
    if (field === 'characterId') {
      const curCharaId = draft.characterId || numFromUser(user, 'characterId')
      setPickedCharaId(curCharaId > 0 ? curCharaId : null)
      setCharaLv(String(curCharaId > 0 ? (ownedCharacterLvs[curCharaId] ?? 1) : 1))
    } else {
      setPickedCharaId(null)
    }
    setModalField(field)
  }

  function closeModal() {
    setModalField(null)
    setPickedCharaId(null)
    setCharaWorksFilter('')
  }

  const onUnlockAllChange = (on: boolean) => {
    setUnlockAll(on)
    localStorage.setItem(UNLOCK_ALL_STORAGE_KEY, on ? '1' : '0')
  }

  const selectDraftItem = useCallback((field: string, itemId: number) => {
    setDraft((d) => ({ ...d, [field]: itemId }))
    closeModal()
  }, [])

  const applyPickedChara = useCallback(async (characterId: number, isOwned: boolean) => {
    const level = Math.min(999, Math.max(1, parseInt(charaLv, 10) || 1))
    setUnlockingCharaId(characterId)
    setErr(null)
    try {
      if (!isOwned) {
        await gameApi.unlockChu3Character(characterId, level)
        keepDraftRef.current = true
        pendingCharaIdRef.current = characterId
        setOwnedCharacters((list) => (list.includes(characterId) ? list : [...list, characterId]))
        setOwnedCharacterLvs((map1) => ({ ...map1, [characterId]: level }))
        setDraft((d) => ({ ...d, characterId }))
        closeModal()
        await loadQuery.refetch()
        toast.add({
          title: texts.collectibles.characterUnlocked(level),
          description: texts.collectibles.saveToApply,
          variant: 'success',
        })
        return
      }

      const oldLv = ownedCharacterLvs[characterId] ?? 1
      if (oldLv !== level) {
        await gameApi.unlockChu3Character(characterId, level)
        setOwnedCharacterLvs((map1) => ({ ...map1, [characterId]: level }))
      }
      setDraft((d) => ({ ...d, characterId }))
      closeModal()
      toast.add({
        title:
          oldLv === level
            ? texts.collectibles.characterSelected
            : texts.collectibles.characterUpdated(level),
        description: texts.collectibles.saveToApply,
        variant: 'success',
      })
    } catch (e) {
      keepDraftRef.current = false
      pendingCharaIdRef.current = null
      setErr(e instanceof Error ? e.message : texts.collectibles.characterUpdateFailed)
    } finally {
      setUnlockingCharaId(null)
    }
  }, [charaLv, loadQuery, ownedCharacterLvs, texts.collectibles, toast.add])

  const pickCharacter = useCallback((characterId: number) => {
    if (characterId <= 0) {
      selectDraftItem('characterId', characterId)
      return
    }
    setPickedCharaId(characterId)
    setCharaLv(String(ownedCharacterLvs[characterId] ?? 1))
  }, [ownedCharacterLvs, selectDraftItem])

  const selectCollectible = useCallback(async (field: string, itemId: number) => {
    if (field === 'characterId') {
      pickCharacter(itemId)
      return
    }
    selectDraftItem(field, itemId)
  }, [pickCharacter, selectDraftItem])

  const applyCharacterChoice = useCallback(async () => {
    if (pickedCharaId == null) return
    if (pickedCharaId <= 0) {
      selectDraftItem('characterId', pickedCharaId)
      return
    }
    await applyPickedChara(pickedCharaId, ownedCharacterSet.has(pickedCharaId))
  }, [applyPickedChara, ownedCharacterSet, pickedCharaId, selectDraftItem])

  const saveCollectibles = useCallback(async () => {
    if (!hasDirty) return
    const nextChara = draft.characterId
    const prevChara = numFromUser(user, 'characterId')
    if (nextChara !== prevChara && nextChara > 0 && !ownedCharacterSet.has(nextChara)) {
      setErr(texts.collectibles.unlockCharacterBeforeSave)
      return
    }
    setSaving(true)
    setErr(null)
    try {
      for (const f of COLLECTIBLES_FIELD_ORDER) {
        const next = draft[f]
        const prev = numFromUser(user, f)
        if (next !== prev) {
          await detailSet('chu3', f, String(next))
        }
      }
      await loadQuery.refetch()
      toast.add({
        title: texts.common.saved,
        variant: 'success',
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.collectibles.saveFailed)
    } finally {
      setSaving(false)
    }
  }, [hasDirty, draft, user, texts.collectibles, texts.common.saved, toast.add, loadQuery, ownedCharacterSet])

  const pageItems = useMemo(
    () => buildPaginationItems(safePage, totalPages),
    [safePage, totalPages],
  )

  const loadErr =
    loadQuery.error instanceof Error
      ? loadQuery.error.message
      : loadQuery.error
        ? texts.common.loadingFailed
        : null

  if (loadQuery.isPending && !loadQuery.data) {
    return (
      <div className="pb-10">
        <PageHeader title={texts.nav.collectibles} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
        <div className="mb-6 flex max-w-md flex-col gap-3">
          <SkeletonBox className="h-11 w-56 rounded-lg" />
          <SkeletonBox className="h-10 w-24 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-kumo-border bg-kumo-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
            >
              <div className="border-kumo-border bg-kumo-tint border-b px-3 py-2.5 text-center">
                <SkeletonBox className="mx-auto h-4 w-24 rounded-md" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-3">
                <SkeletonBox className="h-10 w-full rounded-lg" />
                <SkeletonBox className="aspect-square w-full rounded-xl" />
                <SkeletonBox className="h-9 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader title={texts.nav.collectibles} crumbs={[{ label: texts.nav.home, href: '/home' }]} />

      <div className="mb-6 flex max-w-md flex-col gap-3">
        <Switch
          controlFirst={false}
          label={texts.collectibles.unlockAll}
          checked={unlockAll}
          onCheckedChange={onUnlockAllChange}
          size="base"
        />
        <Button disabled={!hasDirty || saving} onClick={() => void saveCollectibles()}>
          {texts.collectibles.save}
        </Button>
      </div>

      {err || loadErr ? (
        <Text DANGEROUS_className="text-kumo-danger mb-4 text-sm">{err ?? loadErr}</Text>
      ) : null}

      <section>
        <h2 className="text-kumo-default mb-3 text-lg font-semibold">
          {texts.collectibles.equipped}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayRows.map((row) => {
            const cur = numFromUser(effectiveUser, row.field)
            const name = resolveCollectibleName(row.field, cur, allItems, lookups)
            const img = chu3CollectibleImageUrl(row.field, cur, allItems)
            const hasImg = chu3CollectibleHasImage(row.field)
            const textOnly = TEXT_ONLY_PREVIEW_FIELDS.has(row.field)
            const emptyUnlocks = row.options.length === 0
            const isCharacter = row.field === 'characterId'
            const isWidePreview = isWidePreviewField1(row.field)
            const canChange = unlockAll ? catalogBundle != null && row.options.length > 0 : !emptyUnlocks || cur > 0
            return (
              <div
                key={row.field}
                className="border-kumo-border bg-kumo-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
              >
                <div className="border-kumo-border bg-kumo-tint border-b px-3 py-2.5 text-center text-sm font-semibold text-kumo-default">
                  {label(row.field)}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  <div>
                    <div className="text-kumo-default line-clamp-3 min-h-[2.75rem] text-sm font-medium">{name}</div>
                    {!unlockAll && emptyUnlocks && cur === 0 ? (
                      <div className="text-kumo-subtle mt-1 text-xs">
                        {texts.collectibles.nothingUnlocked}
                      </div>
                    ) : null}
                  </div>
                  {textOnly ? (
                    <div className="border-kumo-border shrink-0 border-b border-dashed" aria-hidden />
                  ) : (
                    <div
                      className={`border-kumo-border bg-kumo-recessed flex flex-1 items-center justify-center overflow-hidden rounded-lg border ${
                        isWidePreview
                          ? 'min-h-[88px] px-1 py-2'
                          : isCharacter
                            ? 'aspect-square min-h-[180px] max-h-[240px]'
                          : hasImg
                            ? 'aspect-square min-h-[120px] max-h-[160px]'
                            : 'min-h-[48px] py-2'
                      }`}
                    >
                      {img ? (
                        <img
                          src={img}
                          crossOrigin={imgCross1(img)}
                          alt=""
                          className={
                            isWidePreview
                              ? 'max-h-20 w-full object-contain object-center'
                              : isCharacter
                                ? 'max-h-full max-w-full object-contain p-1'
                              : 'max-h-full max-w-full object-contain p-2'
                          }
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                  )}
                  <Button size="sm" variant="primary" disabled={!canChange} onClick={() => openModal(row.field)}>
                    {texts.collectibles.change}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {modalField && activeRow ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chu3-picker-title"
            className="border-kumo-border bg-kumo-base text-kumo-default flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-xl border shadow-2xl sm:rounded-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-kumo-border bg-kumo-tint flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h2 id="chu3-picker-title" className="text-kumo-default text-lg font-semibold">
                  {label(activeRow.field)}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal} aria-label={texts.collectibles.close}>
                ✕
              </Button>
            </div>

            <div className="border-kumo-border bg-kumo-base shrink-0 border-b px-4 py-3">
              <div className={`grid items-end gap-3 ${activeRow.field === 'characterId' ? 'md:grid-cols-[minmax(0,1fr)_220px]' : ''}`}>
                <label className="flex flex-col gap-1">
                  <span className="text-kumo-subtle text-xs">
                    {texts.collectibles.searchLabel}
                  </span>
                  <Input
                    className="h-11"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder={texts.collectibles.searchPlaceholder}
                    autoFocus
                  />
                </label>
                {activeRow.field === 'characterId' ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-kumo-subtle text-xs">{texts.collectibles.works}</span>
                    <select
                      value={charaWorksFilter}
                      onChange={(e) => setCharaWorksFilter(e.target.value)}
                      className="border-kumo-border bg-kumo-base h-11 rounded-xl border px-3 text-sm text-kumo-default"
                      aria-label={texts.collectibles.worksFilter}
                    >
                      <option value="">{texts.collectibles.allWorks}</option>
                      {charaWorksList.map((one1) => (
                        <option key={one1} value={one1}>
                          {one1}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="bg-kumo-recessed min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {activeRow.field === 'characterId' && pickedCharaId != null ? (
                <div className="mb-4 rounded-xl border border-kumo-border bg-kumo-base p-4">
                  <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
                    <div className="bg-kumo-recessed mx-auto flex aspect-[4/5] w-full max-w-[240px] items-center justify-center overflow-hidden rounded-xl border border-kumo-border">
                      {(() => {
                        const charaImg1 = chu3CollectibleImageUrl('characterId', pickedCharaId, allItems)
                        return charaImg1 ? (
                          <img
                            src={charaImg1}
                            crossOrigin={imgCross1(charaImg1)}
                            alt=""
                            className="max-h-full max-w-full scale-[1.18] object-contain p-1"
                          />
                        ) : null
                      })()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xl font-semibold text-kumo-default">{pickedCharaName}</div>
                      <div className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                        <div>
                          <span className="text-kumo-subtle">{texts.collectibles.works}: </span>
                          <span>{cleanText1(selectedCharaMeta?.worksName) || '—'}</span>
                        </div>
                        <div>
                          <span className="text-kumo-subtle">{texts.collectibles.illustrator}: </span>
                          <span>{cleanText1(selectedCharaMeta?.illustratorName) || '—'}</span>
                        </div>
                        <div>
                          <span className="text-kumo-subtle">ID: </span>
                          <span>{pickedCharaId}</span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-end">
                        <label className="flex flex-col gap-1">
                          <Text size="sm">{texts.collectibles.characterLevel}</Text>
                          <Input
                            type="number"
                            className="h-11"
                            min={1}
                            max={999}
                            value={charaLv}
                            onChange={(e) => setCharaLv(e.target.value)}
                          />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            className="h-11 px-4"
                            disabled={saving || unlockingCharaId != null}
                            onClick={() => void applyCharacterChoice()}
                          >
                            {pickedCharaOwned
                              ? texts.collectibles.applyLevelAndSelect
                              : texts.collectibles.unlockAndSelect}
                          </Button>
                          <Text size="sm" DANGEROUS_className="self-center text-kumo-subtle">
                            {pickedCharaOwned
                              ? texts.collectibles.ownedLevel(pickedCharaLv)
                              : texts.collectibles.locked}
                          </Text>
                        </div>
                      </div>

                      {validAddImages1.length || validRankRewards1.length ? (
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          {validAddImages1.length ? (
                            <div>
                              <Text size="sm" DANGEROUS_className="mb-2 font-medium">
                                {texts.collectibles.additionalImages}
                              </Text>
                              <div className="space-y-1 text-sm text-kumo-subtle">
                                {validAddImages1.slice(0, 8).map((one1, idx1) => (
                                  <div key={idx1}>{one1}</div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {validRankRewards1.length ? (
                            <div>
                              <Text size="sm" DANGEROUS_className="mb-2 font-medium">
                                {texts.collectibles.rankRewards}
                              </Text>
                              <div className="space-y-1 text-sm text-kumo-subtle">
                                {validRankRewards1.slice(0, 8).map((one1, idx1) => (
                                  <div key={idx1}>
                                    {texts.common.level} {one1.lv || '?'} · {one1.reward}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {filteredOptions.length === 0 ? (
                <Text DANGEROUS_className="text-kumo-subtle text-sm">
                  {texts.collectibles.noMatches}
                </Text>
              ) : (
                <div
                  className={
                    chu3CollectibleHasImage(activeRow.field)
                      ? isWidePreviewField1(activeRow.field)
                        ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
                        : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                      : 'grid grid-cols-1 gap-2 sm:grid-cols-2'
                  }
                >
                  {pageSlice.map((o) => {
                    const isEquipped = equippedId === o.itemId
                    const isPicked = activeRow.field === 'characterId' && pickedCharaId === o.itemId
                    const isOwnedCharacter = activeRow.field !== 'characterId' || ownedCharacterSet.has(o.itemId)
                    const charaLvNow = activeRow.field === 'characterId' ? (ownedCharacterLvs[o.itemId] ?? 1) : 0
                    const img = chu3CollectibleImageUrl(activeRow.field, o.itemId, allItems)
                    const displayName = resolveCollectibleName(activeRow.field, o.itemId, allItems, lookups)
                    const hasImg = chu3CollectibleHasImage(activeRow.field)
                    const textOnly = TEXT_ONLY_PREVIEW_FIELDS.has(activeRow.field)
                    const isCharacter = activeRow.field === 'characterId'
                    const isWidePreview = isWidePreviewField1(activeRow.field)
                    return (
                      <Button
                        key={o.itemId}
                        type="button"
                        variant="secondary"
                        disabled={saving || unlockingCharaId != null}
                        onClick={() => void selectCollectible(activeRow.field, o.itemId)}
                        className={`border-kumo-border !bg-kumo-base !text-kumo-default h-auto min-h-0 w-full flex-col items-stretch gap-0 overflow-hidden rounded-xl border p-0 text-left shadow-sm transition-colors hover:border-kumo-accent/50 ${
                          isPicked || isEquipped ? 'ring-kumo-accent ring-2 ring-offset-2 ring-offset-kumo-base' : ''
                        }`}
                      >
                        <div className="text-kumo-default border-kumo-border line-clamp-2 border-b px-3 py-2.5 text-sm font-medium">
                          {displayName}
                        </div>
                        {activeRow.field === 'characterId' ? (
                          <div className="border-kumo-border border-b px-3 py-2">
                            <span
                              className={`rounded-md px-2 py-1 text-xs ${
                                isOwnedCharacter
                                  ? 'bg-kumo-success/15 text-kumo-success'
                                  : 'bg-kumo-warning/15 text-kumo-warning'
                              }`}
                            >
                              {isOwnedCharacter
                                ? texts.collectibles.ownedLevel(charaLvNow)
                                : unlockingCharaId === o.itemId
                                  ? texts.collectibles.unlocking
                                  : texts.collectibles.lockedClickToUnlock}
                            </span>
                          </div>
                        ) : null}
                        {textOnly || !hasImg ? (
                          <div className="border-kumo-border shrink-0 border-b" aria-hidden />
                        ) : (
                          <div
                            className={`bg-kumo-recessed flex items-center justify-center ${
                              isWidePreview
                                ? 'min-h-[100px] px-2 py-3'
                                : isCharacter
                                  ? 'aspect-square min-h-[220px] max-h-[280px]'
                                : 'aspect-[4/3] min-h-[140px] max-h-[200px]'
                            }`}
                          >
                            {img ? (
                              <img
                                src={img}
                                crossOrigin={imgCross1(img)}
                                alt=""
                                className={
                                  isWidePreview
                                    ? 'max-h-24 w-full object-contain object-center'
                                    : isCharacter
                                      ? 'max-h-full max-w-full object-contain p-2'
                                    : 'max-h-[min(180px,100%)] max-w-full object-contain p-3'
                                }
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                        )}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>

            {totalPages > 1 && filteredOptions.length > 0 ? (
              <div className="border-kumo-border bg-kumo-base flex shrink-0 flex-wrap items-center justify-center gap-1 border-t px-4 py-3">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 0 || saving || unlockingCharaId != null}
                  onClick={() => setModalPage(0)}
                >
                  «
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 0 || saving || unlockingCharaId != null}
                  onClick={() => setModalPage((p) => Math.max(0, p - 1))}
                >
                  {texts.common.previousPage}
                </Button>
                {pageItems.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="text-kumo-subtle px-2 text-sm">
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      size="sm"
                      variant={item === safePage ? 'primary' : 'secondary'}
                      disabled={saving || unlockingCharaId != null}
                      onClick={() => setModalPage(item)}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages - 1 || saving || unlockingCharaId != null}
                  onClick={() => setModalPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  {texts.common.nextPage}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages - 1 || saving || unlockingCharaId != null}
                  onClick={() => setModalPage(totalPages - 1)}
                >
                  »
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
