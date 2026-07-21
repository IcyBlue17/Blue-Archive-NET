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
  buildOn9CatalogOptions,
  bundleToOn9Lookups,
  fetchOn9AssetJson,
  isOn9EquippableChara,
  loadOn9CatalogBundle,
  on9CardImageUrl,
  on9CollectibleHasImage,
  on9CollectibleImageUrl,
  type On9AllItems,
  type On9AttachmentJsonEntry,
  type On9CatalogBundle,
  type On9CostumeJsonEntry,
  type On9NameLookups,
} from '../../lib/on9Assets'
import { imgCross } from '../../lib/imgSign'
import {
  buildOn9AppearanceSelectRows,
  ON9_APPEARANCE_FIELD_ORDER,
  ON9_FIELD_ALL_ITEMS_KEY,
  withOn9EquippedIfMissing,
  type On9AppearanceField,
  type On9UserItem,
  type On9UserboxSelectRow,
} from '../../lib/on9Userbox'
import { useAppTexts } from '../../content/texts'

const UNLOCK_ALL_STORAGE_KEY = 'ongeki-collectibles-unlock-all'

const TEXT_ONLY_PREVIEW_FIELDS = new Set(['trophyId', 'characterVoiceNo', 'systemVoiceId'])
const UNLOCKABLE_FIELDS = new Set(['cardId', 'characterId'])

function numFromUser(u: Record<string, unknown>, field: string): number {
  const v = u[field]
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v !== '') return parseInt(v, 10) || 0
  return 0
}

function draftFromUser(u: Record<string, unknown>): Record<string, number> {
  const d: Record<string, number> = {}
  for (const f of ON9_APPEARANCE_FIELD_ORDER) {
    d[f] = numFromUser(u, f)
  }
  return d
}

function resolveName(
  field: string,
  itemId: number,
  allItems: On9AllItems,
  lookups: On9NameLookups | null,
): string {
  if (itemId <= 0) return '—'
  const key = ON9_FIELD_ALL_ITEMS_KEY[field as On9AppearanceField]
  const fromAll = key ? allItems[key]?.[String(itemId)]?.name : undefined
  let fromJson: string | undefined
  if (lookups) {
    switch (field) {
      case 'cardId':
        fromJson = lookups.card.get(itemId)
        break
      case 'characterId':
        fromJson = lookups.chara.get(itemId)
        break
      case 'nameplateId':
        fromJson = lookups.nameplate.get(itemId)
        break
      case 'trophyId':
        fromJson = lookups.trophy.get(itemId)
        break
      default:
        break
    }
  }
  return fromJson ?? fromAll ?? `(unknown ${itemId})`
}

function cleanText(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
  if (!s || s === '-' || s === 'null' || s === 'undefined') return ''
  return s
}

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

type On9IntimacyRow = {
  characterId: number
  intimateLevel: number
  costumeId: number
  attachmentId: number
}

type On9CardTrainingRow = {
  cardId: number
  level: number
  maxLevel: number
  exp: number
  digitalStock: number
  skillId: number
  kaikaDate: string
  choKaikaDate: string
}

type On9DeckRow = {
  deckId: number
  cardId1: number
  cardId2: number
  cardId3: number
}

type On9CollectibleLoad = {
  lockedRows: On9UserboxSelectRow[]
  catalogBundle: On9CatalogBundle
  user: Record<string, unknown>
  draft: Record<string, number>
  allItems: On9AllItems
  lookups: On9NameLookups
  ownedCards: number[]
  ownedCharacters: number[]
  characterRows: On9IntimacyRow[]
  cardRows: On9CardTrainingRow[]
  deckRows: On9DeckRow[]
}

// A card counts as fully trained once it hits the rarity-appropriate cap on level, digital
// stock, and both bloom states — matches the params computeMaxTrainingParams sends.
function isCardMaxed(row: On9CardTrainingRow, rarity: string): boolean {
  const targetMax = rarity === 'N' ? 100 : 70
  const targetStock = rarity === 'N' ? 11 : 5
  const choKaikaSet = row.choKaikaDate !== '' && !row.choKaikaDate.startsWith('0000')
  return (
    row.level >= targetMax &&
    row.maxLevel >= targetMax &&
    row.digitalStock >= targetStock &&
    choKaikaSet
  )
}

function kaikaState(row: On9CardTrainingRow): 0 | 1 | 2 {
  if (row.choKaikaDate && !row.choKaikaDate.startsWith('0000')) return 2
  if (row.kaikaDate && !row.kaikaDate.startsWith('0000')) return 1
  return 0
}

function computeMaxTrainingParams(row: On9CardTrainingRow, rarity: string, choKaikaSkillId: number) {
  const targetMax = rarity === 'N' ? 100 : 70
  const targetStock = rarity === 'N' ? 11 : 5
  return {
    level: targetMax,
    maxLevel: targetMax,
    exp: 0,
    digitalStock: targetStock,
    skillId: choKaikaSkillId > 0 ? choKaikaSkillId : row.skillId,
    kaika: 1 as const,
    choKaika: 1 as const,
  }
}

export function On9CollectiblesPage() {
  const texts = useAppTexts()
  const toast = useKumoToastManager()
  const [unlockAll, setUnlockAll] = useState(() => localStorage.getItem(UNLOCK_ALL_STORAGE_KEY) === '1')
  const [lockedRows, setLockedRows] = useState<On9UserboxSelectRow[]>([])
  const [catalogBundle, setCatalogBundle] = useState<On9CatalogBundle | null>(null)
  const [user, setUser] = useState<Record<string, unknown>>({})
  const [draft, setDraft] = useState<Record<string, number>>(() => draftFromUser({}))
  const [allItems, setAllItems] = useState<On9AllItems>({})
  const [lookups, setLookups] = useState<On9NameLookups | null>(null)
  const [ownedCards, setOwnedCards] = useState<number[]>([])
  const [ownedCharacters, setOwnedCharacters] = useState<number[]>([])
  const [characterRows, setCharacterRows] = useState<On9IntimacyRow[]>([])
  const [intimacyDraft, setIntimacyDraft] = useState<Record<number, string>>({})
  const [intimacySavingId, setIntimacySavingId] = useState<number | null>(null)
  const [outfitDraft, setOutfitDraft] = useState<Record<number, { costumeId: number; attachmentId: number }>>({})
  const [outfitSavingId, setOutfitSavingId] = useState<number | null>(null)
  const [costumeList, setCostumeList] = useState<On9CostumeJsonEntry[]>([])
  const [attachmentList, setAttachmentList] = useState<On9AttachmentJsonEntry[]>([])
  const [costumeLoadFailed, setCostumeLoadFailed] = useState(false)
  const [attachmentLoadFailed, setAttachmentLoadFailed] = useState(false)
  const [cardRows, setCardRows] = useState<On9CardTrainingRow[]>([])
  const [cardSearch, setCardSearch] = useState('')
  const [cardPage, setCardPage] = useState(0)
  const [cardActionId, setCardActionId] = useState<number | null>(null)
  const [bulkMaxProgress, setBulkMaxProgress] = useState<{ done: number; total: number } | null>(null)
  const [cardEditOpen, setCardEditOpen] = useState<Set<number>>(new Set())
  const [cardEditDraft, setCardEditDraft] = useState<
    Record<
      number,
      { level: string; maxLevel: string; exp: string; digitalStock: string; skillId: number; kaika: boolean; choKaika: boolean }
    >
  >({})
  const [deckRows, setDeckRows] = useState<On9DeckRow[]>([])
  const [deckDraft, setDeckDraft] = useState<Record<number, { cardId1: number; cardId2: number; cardId3: number }>>({})
  const [deckSavingId, setDeckSavingId] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modalField, setModalField] = useState<string | null>(null)
  const [modalPage, setModalPage] = useState(0)
  const [modalSearch, setModalSearch] = useState('')
  const [charaFilter, setCharaFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [customIdEnabled, setCustomIdEnabled] = useState(false)
  const [customIdInput, setCustomIdInput] = useState('')
  const [unlockingId, setUnlockingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const keepDraftRef = useRef(false)
  const pendingFieldRef = useRef<{ field: string; itemId: number } | null>(null)

  const deferredSearch = useDeferredValue(modalSearch.trim().toLowerCase())

  const label = useCallback(
    (field: string) => texts.collectibles.fieldLabels[field as keyof typeof texts.collectibles.fieldLabels] ?? field,
    [texts],
  )

  const effectiveUser = useMemo(() => {
    const o: Record<string, unknown> = { ...user }
    for (const f of ON9_APPEARANCE_FIELD_ORDER) {
      o[f] = draft[f]
    }
    return o
  }, [user, draft])

  const hasDirty = useMemo(
    () => ON9_APPEARANCE_FIELD_ORDER.some((f) => numFromUser(user, f) !== draft[f]),
    [user, draft],
  )

  const displayRows = useMemo((): On9UserboxSelectRow[] => {
    const base: On9UserboxSelectRow[] =
      unlockAll && catalogBundle
        ? ON9_APPEARANCE_FIELD_ORDER.map((f) => {
            // voice fields have no image catalog to expand into — they always use their fixed range
            if (f === 'characterVoiceNo' || f === 'systemVoiceId') {
              return (
                lockedRows.find((r) => r.field === f) ?? { field: f, allItemsKey: '', options: [] }
              )
            }
            const key = ON9_FIELD_ALL_ITEMS_KEY[f]
            const options = buildOn9CatalogOptions(f, catalogBundle)
            return { field: f, allItemsKey: key, options }
          })
        : lockedRows
    return base.map((row) =>
      withOn9EquippedIfMissing(row, numFromUser(effectiveUser, row.field), allItems),
    )
  }, [unlockAll, catalogBundle, lockedRows, allItems, effectiveUser])

  const loadQuery = useQuery<On9CollectibleLoad>({
    queryKey: qk.collectiblesOngeki,
    placeholderData: (old) => old,
    queryFn: async () => {
      const [box, allRaw, bundle] = await Promise.all([
        gameApi.ongekiUserBox(),
        dataApi.allItems('ongeki'),
        loadOn9CatalogBundle(),
      ])
      const items = (box.items ?? []) as On9UserItem[]
      const u = (box.user ?? {}) as Record<string, unknown>
      const cardIds = (box.cards ?? [])
        .map((x) => (typeof x.cardId === 'number' ? x.cardId : parseInt(String(x.cardId), 10)))
        .filter((n) => Number.isFinite(n) && n > 0)
      const charIds = (box.characters ?? [])
        .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
        .filter((n) => Number.isFinite(n) && n > 0)
      const charRows = (box.characterRows ?? [])
        .map((r) => ({
          characterId: r.characterId,
          intimateLevel: r.intimateLevel ?? 0,
          costumeId: r.costumeId ?? 0,
          attachmentId: r.attachmentId ?? 0,
        }))
        .filter((r) => Number.isFinite(r.characterId) && r.characterId > 0)
      const cardTrainingRows = (box.cards ?? [])
        .map((x) => ({
          cardId: typeof x.cardId === 'number' ? x.cardId : parseInt(String(x.cardId), 10),
          level: x.level ?? 1,
          maxLevel: x.maxLevel ?? 20,
          exp: x.exp ?? 0,
          digitalStock: x.digitalStock ?? 1,
          skillId: x.skillId ?? 0,
          kaikaDate: x.kaikaDate ?? '',
          choKaikaDate: x.choKaikaDate ?? '',
        }))
        .filter((r) => Number.isFinite(r.cardId) && r.cardId > 0)
      const deckRowsRaw = (box.decks ?? [])
        .filter((d) => Number.isFinite(d.deckId))
        .map((d) => ({
          deckId: d.deckId,
          cardId1: d.cardId1 ?? 0,
          cardId2: d.cardId2 ?? 0,
          cardId3: d.cardId3 ?? 0,
        }))
      const ai = allRaw as On9AllItems
      return {
        allItems: ai,
        user: u,
        catalogBundle: bundle,
        lookups: bundleToOn9Lookups(bundle),
        lockedRows: buildOn9AppearanceSelectRows(items, cardIds, charIds, u, ai),
        draft: draftFromUser(u),
        ownedCards: cardIds,
        ownedCharacters: charIds,
        characterRows: charRows,
        cardRows: cardTrainingRows,
        deckRows: deckRowsRaw,
      }
    },
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await fetchOn9AssetJson<On9CostumeJsonEntry[]>('costume.json')
        if (!cancelled) setCostumeList(list)
      } catch {
        if (!cancelled) setCostumeLoadFailed(true)
      }
    })()
    void (async () => {
      try {
        const list = await fetchOn9AssetJson<On9AttachmentJsonEntry[]>('attachment.json')
        if (!cancelled) setAttachmentList(list)
      } catch {
        if (!cancelled) setAttachmentLoadFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loadQuery.data) return
    setAllItems(loadQuery.data.allItems)
    setUser(loadQuery.data.user)
    setCatalogBundle(loadQuery.data.catalogBundle)
    setLookups(loadQuery.data.lookups)
    setOwnedCards(loadQuery.data.ownedCards)
    setOwnedCharacters(loadQuery.data.ownedCharacters)
    setCharacterRows(loadQuery.data.characterRows)
    setIntimacyDraft({})
    setOutfitDraft({})
    setCardRows(loadQuery.data.cardRows)
    setDeckRows(loadQuery.data.deckRows)
    setDeckDraft({})
    setLockedRows(loadQuery.data.lockedRows)
    setDraft((oldDraft) => {
      if (!keepDraftRef.current) return loadQuery.data.draft
      const nextDraft = { ...loadQuery.data.draft, ...oldDraft }
      const pending = pendingFieldRef.current
      if (pending) nextDraft[pending.field] = pending.itemId
      keepDraftRef.current = false
      pendingFieldRef.current = null
      return nextDraft
    })
    pendingFieldRef.current = null
  }, [loadQuery.data])

  const ownedCardSet = useMemo(() => new Set(ownedCards), [ownedCards])
  const ownedCharacterSet = useMemo(() => new Set(ownedCharacters), [ownedCharacters])

  // intimacy only applies to navigator charas (the ones the game can equip/communicate with)
  const intimacyRows = useMemo(
    () =>
      characterRows
        .filter((r) => isOn9EquippableChara(r.characterId, allItems.chara?.[String(r.characterId)]))
        .sort((a, b) => a.characterId - b.characterId),
    [characterRows, allItems],
  )

  const isOwned = useCallback(
    (field: string, itemId: number) => {
      if (field === 'cardId') return ownedCardSet.has(itemId)
      if (field === 'characterId') return ownedCharacterSet.has(itemId)
      return true
    },
    [ownedCardSet, ownedCharacterSet],
  )

  const activeRow = useMemo(
    () => (modalField ? displayRows.find((r) => r.field === modalField) ?? null : null),
    [displayRows, modalField],
  )

  const pickerOptionsFull = useMemo(() => activeRow?.options ?? [], [activeRow])

  const cardMetaMap = useMemo(() => {
    const raw = allItems.card ?? {}
    const out: Record<
      number,
      {
        charaName: string
        rarity: string
        skillId: number
        skillName: string
        choKaikaSkillId: number
        choKaikaSkillName: string
      }
    > = {}
    for (const [id, row] of Object.entries(raw)) {
      const num = parseInt(id, 10)
      if (!Number.isNaN(num)) {
        out[num] = {
          charaName: cleanText(row.charaName),
          rarity: cleanText(row.rarity),
          skillId: numFromUser(row, 'skillId'),
          skillName: cleanText(row.skillName),
          choKaikaSkillId: numFromUser(row, 'choKaikaSkillId'),
          choKaikaSkillName: cleanText(row.choKaikaSkillName),
        }
      }
    }
    return out
  }, [allItems])

  const cardCharaList = useMemo(() => {
    if (activeRow?.field !== 'cardId') return [] as string[]
    const set = new Set<string>()
    Object.values(cardMetaMap).forEach((meta) => {
      if (meta.charaName) set.add(meta.charaName)
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [activeRow?.field, cardMetaMap])

  const cardRarityList = useMemo(() => {
    if (activeRow?.field !== 'cardId') return [] as string[]
    const set = new Set<string>()
    Object.values(cardMetaMap).forEach((meta) => {
      if (meta.rarity) set.add(meta.rarity)
    })
    const order = ['N', 'R', 'SR', 'SRPlus', 'SSR']
    return [...set].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }, [activeRow?.field, cardMetaMap])

  const filteredOptions = useMemo(() => {
    return pickerOptionsFull.filter((o) => {
      if (activeRow?.field === 'cardId') {
        const meta = cardMetaMap[o.itemId]
        if (charaFilter && meta?.charaName !== charaFilter) return false
        if (rarityFilter && meta?.rarity !== rarityFilter) return false
      }
      if (!deferredSearch) return true
      const extra = activeRow?.field === 'cardId' ? (cardMetaMap[o.itemId]?.charaName ?? '') : ''
      return (
        o.name.toLowerCase().includes(deferredSearch) ||
        String(o.itemId).includes(deferredSearch) ||
        extra.toLowerCase().includes(deferredSearch)
      )
    })
  }, [pickerOptionsFull, deferredSearch, activeRow?.field, cardMetaMap, charaFilter, rarityFilter])

  const pageSize = activeRow && on9CollectibleHasImage(activeRow.field) ? 12 : 24
  const totalPages = Math.max(1, Math.ceil(filteredOptions.length / pageSize))
  const safePage = Math.min(modalPage, totalPages - 1)
  const pageSlice = filteredOptions.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const equippedId = modalField ? numFromUser(effectiveUser, modalField) : 0

  useEffect(() => {
    setModalPage(0)
  }, [modalField, deferredSearch, charaFilter, rarityFilter, pageSize])

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
    setCharaFilter('')
    setRarityFilter('')
    setCustomIdEnabled(false)
    const currentId = draft[field] ?? numFromUser(user, field)
    setCustomIdInput(currentId > 0 ? String(currentId) : '')
    setModalField(field)
  }

  const closeModal = useCallback(() => {
    setModalField(null)
    setCharaFilter('')
    setRarityFilter('')
    setCustomIdEnabled(false)
    setCustomIdInput('')
  }, [])

  const onUnlockAllChange = (on: boolean) => {
    setUnlockAll(on)
    localStorage.setItem(UNLOCK_ALL_STORAGE_KEY, on ? '1' : '0')
  }

  const selectDraftItem = useCallback(
    (field: string, itemId: number) => {
      setDraft((d) => ({ ...d, [field]: itemId }))
      closeModal()
    },
    [closeModal],
  )

  const unlockAndSelect = useCallback(
    async (field: string, itemId: number) => {
      setUnlockingId(itemId)
      setErr(null)
      try {
        if (field === 'cardId') {
          await gameApi.unlockOngekiCard(itemId)
          setOwnedCards((list) => (list.includes(itemId) ? list : [...list, itemId]))
        } else {
          await gameApi.unlockOngekiCharacter(itemId)
          setOwnedCharacters((list) => (list.includes(itemId) ? list : [...list, itemId]))
        }
        keepDraftRef.current = true
        pendingFieldRef.current = { field, itemId }
        setDraft((d) => ({ ...d, [field]: itemId }))
        closeModal()
        await loadQuery.refetch()
        toast.add({
          title: texts.collectibles.itemUnlocked,
          description: texts.collectibles.saveToApply,
          variant: 'success',
        })
      } catch (e) {
        keepDraftRef.current = false
        pendingFieldRef.current = null
        setErr(e instanceof Error ? e.message : texts.collectibles.saveFailed)
      } finally {
        setUnlockingId(null)
      }
    },
    [closeModal, loadQuery, texts.collectibles, toast],
  )

  const selectCollectible = useCallback(
    async (field: string, itemId: number) => {
      if (UNLOCKABLE_FIELDS.has(field) && itemId > 0 && !isOwned(field, itemId)) {
        await unlockAndSelect(field, itemId)
        return
      }
      selectDraftItem(field, itemId)
    },
    [isOwned, selectDraftItem, unlockAndSelect],
  )

  const applyCustomCollectibleId = useCallback(async () => {
    if (!modalField) return
    const customId = parseInt(customIdInput, 10)
    if (!Number.isFinite(customId) || customId < 0) {
      setErr(texts.collectibles.invalidCustomId)
      return
    }
    // non-navigator charas have no story model and crash the game at logout — refuse them
    if (
      modalField === 'characterId' &&
      customId > 0 &&
      !isOn9EquippableChara(customId, allItems.chara?.[String(customId)])
    ) {
      setErr(texts.collectibles.charaNotEquippable)
      return
    }
    setErr(null)
    if (UNLOCKABLE_FIELDS.has(modalField) && customId > 0 && !isOwned(modalField, customId)) {
      await unlockAndSelect(modalField, customId)
      return
    }
    setDraft((d) => ({ ...d, [modalField]: customId }))
    closeModal()
  }, [allItems, closeModal, customIdInput, isOwned, modalField, texts.collectibles, unlockAndSelect])

  const saveCollectibles = useCallback(async () => {
    if (!hasDirty) return
    setSaving(true)
    setErr(null)
    try {
      for (const f of ON9_APPEARANCE_FIELD_ORDER) {
        const next = draft[f]
        const prev = numFromUser(user, f)
        if (next !== prev) {
          await detailSet('ongeki', f, String(next))
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
  }, [hasDirty, draft, user, texts.collectibles, texts.common.saved, toast, loadQuery])

  const saveIntimate = useCallback(
    async (charaId: number, currentLevel: number) => {
      const raw = intimacyDraft[charaId] ?? String(currentLevel)
      const lvl = parseInt(raw, 10)
      if (!Number.isFinite(lvl) || lvl < 0 || lvl > 100) {
        setErr(texts.collectibles.invalidIntimacy)
        return
      }
      setIntimacySavingId(charaId)
      setErr(null)
      try {
        await gameApi.setOngekiIntimate(charaId, lvl)
        // update locally instead of refetching so unsaved appearance drafts survive
        setCharacterRows((rows) =>
          rows.map((r) => (r.characterId === charaId ? { ...r, intimateLevel: lvl } : r)),
        )
        setIntimacyDraft((d) => {
          const next = { ...d }
          delete next[charaId]
          return next
        })
        toast.add({ title: texts.collectibles.intimacyUpdated(lvl), variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.collectibles.saveFailed)
      } finally {
        setIntimacySavingId(null)
      }
    },
    [intimacyDraft, texts.collectibles, toast],
  )

  const pageItems = useMemo(() => buildPaginationItems(safePage, totalPages), [safePage, totalPages])

  const costumeByChara = useMemo(() => {
    const map = new Map<number, On9CostumeJsonEntry[]>()
    for (const c of costumeList) {
      if (typeof c.charaId !== 'number') continue
      const list = map.get(c.charaId) ?? []
      list.push(c)
      map.set(c.charaId, list)
    }
    return map
  }, [costumeList])

  const attachmentByChara = useMemo(() => {
    const map = new Map<number, On9AttachmentJsonEntry[]>()
    for (const a of attachmentList) {
      for (const cid of a.attachCharaIds ?? []) {
        const list = map.get(cid) ?? []
        list.push(a)
        map.set(cid, list)
      }
    }
    return map
  }, [attachmentList])

  const saveOutfit = useCallback(
    async (characterId: number, currentCostumeId: number, currentAttachmentId: number) => {
      const draftVal = outfitDraft[characterId]
      const costumeId = draftVal?.costumeId ?? currentCostumeId
      const attachmentId = draftVal?.attachmentId ?? currentAttachmentId
      setOutfitSavingId(characterId)
      setErr(null)
      try {
        await gameApi.setOngekiOutfit(characterId, costumeId, attachmentId)
        setCharacterRows((rows) =>
          rows.map((r) => (r.characterId === characterId ? { ...r, costumeId, attachmentId } : r)),
        )
        setOutfitDraft((d) => {
          const next = { ...d }
          delete next[characterId]
          return next
        })
        toast.add({ title: texts.collectibles.outfitUpdated, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.collectibles.outfitSaveFailed)
      } finally {
        setOutfitSavingId(null)
      }
    },
    [outfitDraft, texts.collectibles, toast],
  )

  const deferredCardSearch = useDeferredValue(cardSearch.trim().toLowerCase())

  const filteredCardRows = useMemo(() => {
    if (!deferredCardSearch) return cardRows
    return cardRows.filter((row) => {
      const name = resolveName('cardId', row.cardId, allItems, lookups).toLowerCase()
      const charaName = (cardMetaMap[row.cardId]?.charaName ?? '').toLowerCase()
      return (
        name.includes(deferredCardSearch) ||
        String(row.cardId).includes(deferredCardSearch) ||
        charaName.includes(deferredCardSearch)
      )
    })
  }, [cardRows, deferredCardSearch, allItems, lookups, cardMetaMap])

  const CARD_PAGE_SIZE = 12
  const cardTotalPages = Math.max(1, Math.ceil(filteredCardRows.length / CARD_PAGE_SIZE))
  const safeCardPage = Math.min(cardPage, cardTotalPages - 1)
  const cardPageSlice = filteredCardRows.slice(
    safeCardPage * CARD_PAGE_SIZE,
    safeCardPage * CARD_PAGE_SIZE + CARD_PAGE_SIZE,
  )
  const cardPageItems = useMemo(
    () => buildPaginationItems(safeCardPage, cardTotalPages),
    [safeCardPage, cardTotalPages],
  )

  useEffect(() => {
    setCardPage(0)
  }, [deferredCardSearch])

  const maxOneCard = useCallback(
    async (row: On9CardTrainingRow) => {
      const meta = cardMetaMap[row.cardId]
      const rarity = meta?.rarity ?? ''
      const params = computeMaxTrainingParams(row, rarity, meta?.choKaikaSkillId ?? 0)
      setCardActionId(row.cardId)
      setErr(null)
      try {
        const res = await gameApi.setOngekiCardTraining({ cardId: row.cardId, ...params })
        setCardRows((rows) => rows.map((r) => (r.cardId === row.cardId ? { ...r, ...res } : r)))
        toast.add({ title: texts.common.saved, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.collectibles.cardTrainingSaveFailed)
      } finally {
        setCardActionId(null)
      }
    },
    [cardMetaMap, texts.collectibles, texts.common.saved, toast],
  )

  const maxAllCards = useCallback(async () => {
    const targets = cardRows.filter((row) => !isCardMaxed(row, cardMetaMap[row.cardId]?.rarity ?? ''))
    if (targets.length === 0) return
    setErr(null)
    setBulkMaxProgress({ done: 0, total: targets.length })
    try {
      for (let i = 0; i < targets.length; i++) {
        const row = targets[i]!
        const meta = cardMetaMap[row.cardId]
        const rarity = meta?.rarity ?? ''
        const params = computeMaxTrainingParams(row, rarity, meta?.choKaikaSkillId ?? 0)
        await gameApi.setOngekiCardTraining({ cardId: row.cardId, ...params })
        setBulkMaxProgress({ done: i + 1, total: targets.length })
      }
      await loadQuery.refetch()
      toast.add({ title: texts.common.saved, variant: 'success' })
    } catch (e) {
      setErr(e instanceof Error ? e.message : texts.collectibles.cardTrainingSaveFailed)
    } finally {
      setBulkMaxProgress(null)
    }
  }, [cardRows, cardMetaMap, loadQuery, texts.collectibles, texts.common.saved, toast])

  const changeCardSkill = useCallback(
    async (row: On9CardTrainingRow, skillId: number) => {
      setCardActionId(row.cardId)
      setErr(null)
      try {
        const res = await gameApi.setOngekiCardTraining({
          cardId: row.cardId,
          level: row.level,
          maxLevel: row.maxLevel,
          exp: row.exp,
          digitalStock: row.digitalStock,
          skillId,
          kaika: row.kaikaDate && !row.kaikaDate.startsWith('0000') ? 1 : 0,
          choKaika: row.choKaikaDate && !row.choKaikaDate.startsWith('0000') ? 1 : 0,
        })
        setCardRows((rows) => rows.map((r) => (r.cardId === row.cardId ? { ...r, ...res } : r)))
        toast.add({ title: texts.common.saved, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.collectibles.cardTrainingSaveFailed)
      } finally {
        setCardActionId(null)
      }
    },
    [texts.collectibles, texts.common.saved, toast],
  )

  const toggleCardEdit = useCallback((row: On9CardTrainingRow) => {
    setCardEditOpen((s) => {
      const next = new Set(s)
      if (next.has(row.cardId)) {
        next.delete(row.cardId)
      } else {
        next.add(row.cardId)
        const state = kaikaState(row)
        setCardEditDraft((d) => ({
          ...d,
          [row.cardId]: {
            level: String(row.level),
            maxLevel: String(row.maxLevel),
            exp: String(row.exp),
            digitalStock: String(row.digitalStock),
            skillId: row.skillId,
            kaika: state >= 1,
            choKaika: state >= 2,
          },
        }))
      }
      return next
    })
  }, [])

  const saveCardEdit = useCallback(
    async (row: On9CardTrainingRow) => {
      const d = cardEditDraft[row.cardId]
      if (!d) return
      const level = parseInt(d.level, 10)
      const maxLevel = parseInt(d.maxLevel, 10)
      const exp = parseInt(d.exp, 10)
      const digitalStock = parseInt(d.digitalStock, 10)
      if (
        !Number.isFinite(level) ||
        level < 1 ||
        level > 100 ||
        !Number.isFinite(maxLevel) ||
        maxLevel < 10 ||
        maxLevel > 100 ||
        !Number.isFinite(exp) ||
        exp < 0 ||
        !Number.isFinite(digitalStock) ||
        digitalStock < 1 ||
        digitalStock > 11
      ) {
        setErr(texts.collectibles.cardEditInvalidRange)
        return
      }
      setCardActionId(row.cardId)
      setErr(null)
      try {
        const res = await gameApi.setOngekiCardTraining({
          cardId: row.cardId,
          level,
          maxLevel,
          exp,
          digitalStock,
          skillId: d.skillId,
          kaika: d.kaika ? 1 : 0,
          choKaika: d.choKaika ? 1 : 0,
        })
        setCardRows((rows) => rows.map((r) => (r.cardId === row.cardId ? { ...r, ...res } : r)))
        setCardEditOpen((s) => {
          const next = new Set(s)
          next.delete(row.cardId)
          return next
        })
        setCardEditDraft((m) => {
          const next = { ...m }
          delete next[row.cardId]
          return next
        })
        toast.add({ title: texts.common.saved, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.collectibles.cardTrainingSaveFailed)
      } finally {
        setCardActionId(null)
      }
    },
    [cardEditDraft, texts.collectibles, texts.common.saved, toast],
  )

  const deckCardOptions = useMemo(() => {
    const seen = new Map<number, string>()
    for (const row of cardRows) {
      if (seen.has(row.cardId)) continue
      const name = resolveName('cardId', row.cardId, allItems, lookups)
      const charaName = cardMetaMap[row.cardId]?.charaName ?? ''
      seen.set(row.cardId, charaName ? `${name} (${charaName})` : name)
    }
    return [...seen.entries()]
      .map(([itemId, label]) => ({ itemId, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ja'))
  }, [cardRows, allItems, lookups, cardMetaMap])

  const saveDeck = useCallback(
    async (deck: On9DeckRow) => {
      const draftVal = deckDraft[deck.deckId]
      const cardId1 = draftVal?.cardId1 ?? deck.cardId1
      const cardId2 = draftVal?.cardId2 ?? deck.cardId2
      const cardId3 = draftVal?.cardId3 ?? deck.cardId3
      if (cardId1 === cardId2 || cardId1 === cardId3 || cardId2 === cardId3) {
        setErr(texts.collectibles.deckDuplicateWarning)
        return
      }
      setDeckSavingId(deck.deckId)
      setErr(null)
      try {
        await gameApi.setOngekiDeck(deck.deckId, cardId1, cardId2, cardId3)
        setDeckRows((rows) =>
          rows.map((r) => (r.deckId === deck.deckId ? { ...r, cardId1, cardId2, cardId3 } : r)),
        )
        setDeckDraft((d) => {
          const next = { ...d }
          delete next[deck.deckId]
          return next
        })
        toast.add({ title: texts.collectibles.deckUpdated, variant: 'success' })
      } catch (e) {
        setErr(e instanceof Error ? e.message : texts.collectibles.deckSaveFailed)
      } finally {
        setDeckSavingId(null)
      }
    },
    [deckDraft, texts.collectibles, toast],
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
        <PageHeader title={texts.nav.on9Collectibles} crumbs={[{ label: texts.nav.home, href: '/home' }]} />
        <div className="mb-6 flex max-w-md flex-col gap-3">
          <SkeletonBox className="h-11 w-56 rounded-lg" />
          <SkeletonBox className="h-10 w-24 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-kumo-line bg-kumo-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
            >
              <div className="border-kumo-line bg-kumo-tint border-b px-3 py-2.5 text-center">
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
      <PageHeader title={texts.nav.on9Collectibles} crumbs={[{ label: texts.nav.home, href: '/home' }]} />

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
        <h2 className="text-kumo-default mb-3 text-lg font-semibold">{texts.collectibles.equipped}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayRows.map((row) => {
            const cur = numFromUser(effectiveUser, row.field)
            const name = resolveName(row.field, cur, allItems, lookups)
            const img = on9CollectibleImageUrl(row.field, cur, allItems)
            const hasImg = on9CollectibleHasImage(row.field)
            const textOnly = TEXT_ONLY_PREVIEW_FIELDS.has(row.field)
            const emptyUnlocks = row.options.length === 0
            const isWidePreview = row.field === 'nameplateId'
            return (
              <div
                key={row.field}
                className="border-kumo-line bg-kumo-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
              >
                <div className="border-kumo-line bg-kumo-tint border-b px-3 py-2.5 text-center text-sm font-semibold text-kumo-default">
                  {label(row.field)}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  <div>
                    <div className="text-kumo-default line-clamp-3 min-h-[2.75rem] text-sm font-medium">{name}</div>
                    {!unlockAll && emptyUnlocks && cur === 0 ? (
                      <div className="text-kumo-subtle mt-1 text-xs">{texts.collectibles.nothingUnlocked}</div>
                    ) : null}
                  </div>
                  {textOnly ? (
                    <div className="border-kumo-line shrink-0 border-b border-dashed" aria-hidden />
                  ) : (
                    <div
                      className={`border-kumo-line bg-kumo-recessed flex flex-1 items-center justify-center overflow-hidden rounded-lg border ${
                        isWidePreview
                          ? 'min-h-[88px] px-1 py-2'
                          : hasImg
                            ? 'aspect-[3/4] min-h-[180px] max-h-[260px]'
                            : 'min-h-[48px] py-2'
                      }`}
                    >
                      {img ? (
                        <img
                          src={img}
                          crossOrigin={imgCross(img)}
                          alt=""
                          className={
                            isWidePreview
                              ? 'max-h-20 w-full object-contain object-center'
                              : 'max-h-full max-w-full object-contain p-1'
                          }
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                  )}
                  <Button size="sm" variant="primary" onClick={() => openModal(row.field)}>
                    {texts.collectibles.change}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-kumo-default mb-1 text-lg font-semibold">{texts.collectibles.intimacyTitle}</h2>
        <Text DANGEROUS_className="text-kumo-subtle mb-3 block text-sm">{texts.collectibles.intimacyHint}</Text>
        {intimacyRows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.collectibles.noIntimacyCharas}</Text>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {intimacyRows.map((row) => {
              const img = on9CollectibleImageUrl('characterId', row.characterId, allItems, true)
              const name = resolveName('characterId', row.characterId, allItems, lookups)
              const draftVal = intimacyDraft[row.characterId] ?? String(row.intimateLevel)
              const dirty = parseInt(draftVal, 10) !== row.intimateLevel
              return (
                <div
                  key={row.characterId}
                  className="border-kumo-line bg-kumo-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="border-kumo-line bg-kumo-recessed h-16 w-12 shrink-0 overflow-hidden rounded-md border">
                      {img ? (
                        <img
                          src={img}
                          crossOrigin={imgCross(img)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-kumo-default truncate text-sm font-medium">{name}</div>
                      <div className="text-kumo-subtle text-xs">
                        {texts.collectibles.intimacyCurrent(row.intimateLevel)}
                      </div>
                    </div>
                  </div>
                  <div className="border-kumo-line flex items-center gap-2 border-t px-3 py-2.5">
                    <Input
                      className="h-9 w-24"
                      type="number"
                      min={0}
                      max={100}
                      value={draftVal}
                      onChange={(e) =>
                        setIntimacyDraft((d) => ({ ...d, [row.characterId]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={!dirty || intimacySavingId != null}
                      onClick={() => void saveIntimate(row.characterId, row.intimateLevel)}
                    >
                      {intimacySavingId === row.characterId
                        ? texts.collectibles.unlocking
                        : texts.collectibles.applyIntimacy}
                    </Button>
                  </div>
                  {(() => {
                    const outfitVal = outfitDraft[row.characterId]
                    const costumeId = outfitVal?.costumeId ?? row.costumeId
                    const attachmentId = outfitVal?.attachmentId ?? row.attachmentId
                    const outfitDirty = costumeId !== row.costumeId || attachmentId !== row.attachmentId
                    const costumeOptions = costumeByChara.get(row.characterId) ?? []
                    const attachmentOptions = attachmentByChara.get(row.characterId) ?? []
                    return (
                      <div className="border-kumo-line flex flex-col gap-2 border-t px-3 py-2.5">
                        <label className="flex items-center gap-2 text-xs">
                          <span className="text-kumo-subtle w-16 shrink-0">
                            {texts.collectibles.costumeLabel}
                          </span>
                          <select
                            value={costumeId}
                            onChange={(e) =>
                              setOutfitDraft((d) => ({
                                ...d,
                                [row.characterId]: {
                                  costumeId: parseInt(e.target.value, 10) || 0,
                                  attachmentId,
                                },
                              }))
                            }
                            className="border-kumo-line bg-kumo-base h-9 flex-1 rounded-lg border px-2 text-sm text-kumo-default"
                          >
                            <option value={0}>{texts.common.empty}</option>
                            {costumeOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {costumeLoadFailed && costumeOptions.length === 0 ? (
                          <div className="text-kumo-subtle text-xs">{texts.collectibles.costumeUnavailable}</div>
                        ) : null}
                        <label className="flex items-center gap-2 text-xs">
                          <span className="text-kumo-subtle w-16 shrink-0">
                            {texts.collectibles.attachmentLabel}
                          </span>
                          <select
                            value={attachmentId}
                            onChange={(e) =>
                              setOutfitDraft((d) => ({
                                ...d,
                                [row.characterId]: {
                                  costumeId,
                                  attachmentId: parseInt(e.target.value, 10) || 0,
                                },
                              }))
                            }
                            className="border-kumo-line bg-kumo-base h-9 flex-1 rounded-lg border px-2 text-sm text-kumo-default"
                          >
                            <option value={0}>{texts.common.empty}</option>
                            {attachmentOptions.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        {attachmentLoadFailed && attachmentOptions.length === 0 ? (
                          <div className="text-kumo-subtle text-xs">
                            {texts.collectibles.attachmentUnavailable}
                          </div>
                        ) : null}
                        {outfitDirty ? (
                          <Button
                            size="sm"
                            disabled={outfitSavingId != null}
                            onClick={() => void saveOutfit(row.characterId, row.costumeId, row.attachmentId)}
                          >
                            {outfitSavingId === row.characterId
                              ? texts.collectibles.unlocking
                              : texts.collectibles.saveOutfit}
                          </Button>
                        ) : null}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-kumo-default mb-1 text-lg font-semibold">{texts.collectibles.cardTrainingTitle}</h2>
        <Text DANGEROUS_className="text-kumo-subtle mb-3 block text-sm">
          {texts.collectibles.cardTrainingHint}
        </Text>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex max-w-sm flex-1 flex-col gap-1">
            <span className="text-kumo-subtle text-xs">{texts.collectibles.searchLabel}</span>
            <Input
              className="h-10"
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              placeholder={texts.collectibles.cardTrainingSearchPlaceholder}
            />
          </label>
          <Button
            variant="secondary"
            disabled={bulkMaxProgress != null || cardActionId != null || cardRows.length === 0}
            onClick={() => void maxAllCards()}
          >
            {bulkMaxProgress
              ? texts.collectibles.maxingAllProgress(bulkMaxProgress.done, bulkMaxProgress.total)
              : texts.collectibles.maxAllCards}
          </Button>
        </div>
        {cardRows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.collectibles.noCardsOwned}</Text>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cardPageSlice.map((row) => {
                const meta = cardMetaMap[row.cardId]
                const rarity = meta?.rarity ?? ''
                const name = resolveName('cardId', row.cardId, allItems, lookups)
                const img = on9CardImageUrl(row.cardId, true)
                const state = kaikaState(row)
                const stateLabel =
                  state === 2
                    ? texts.collectibles.kaikaTwo
                    : state === 1
                      ? texts.collectibles.kaikaOne
                      : texts.collectibles.kaikaNone
                const maxed = isCardMaxed(row, rarity)
                const currentSkillName =
                  row.skillId === meta?.choKaikaSkillId && (meta?.choKaikaSkillId ?? 0) > 0
                    ? meta?.choKaikaSkillName
                    : (allItems.skill?.[String(row.skillId)]?.name ?? meta?.skillName)
                const busy = cardActionId === row.cardId || bulkMaxProgress != null
                return (
                  <div
                    key={row.cardId}
                    className="border-kumo-line bg-kumo-base flex flex-col overflow-hidden rounded-lg border shadow-sm"
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="border-kumo-line bg-kumo-recessed h-16 w-16 shrink-0 overflow-hidden rounded-md border">
                        {img ? (
                          <img
                            src={img}
                            crossOrigin={imgCross(img)}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-kumo-default truncate text-sm font-medium">{name}</div>
                        <div className="text-kumo-subtle text-xs">
                          {texts.collectibles.cardLevelLabel(row.level, row.maxLevel)}
                        </div>
                        <div className="text-kumo-subtle text-xs">{stateLabel}</div>
                      </div>
                    </div>
                    <div className="border-kumo-line flex flex-col gap-2 border-t px-3 py-2.5">
                      <label className="flex items-center gap-2 text-xs">
                        <span className="text-kumo-subtle w-14 shrink-0">
                          {texts.collectibles.currentSkillLabel}
                        </span>
                        <select
                          value={row.skillId}
                          disabled={busy}
                          onChange={(e) => void changeCardSkill(row, parseInt(e.target.value, 10) || 0)}
                          className="border-kumo-line bg-kumo-base h-9 flex-1 rounded-lg border px-2 text-sm text-kumo-default"
                        >
                          {meta?.skillId ? (
                            <option value={meta.skillId}>
                              {(meta.skillName || String(meta.skillId)) + texts.collectibles.skillNormalSuffix}
                            </option>
                          ) : null}
                          {meta?.choKaikaSkillId ? (
                            <option value={meta.choKaikaSkillId}>
                              {(meta.choKaikaSkillName || String(meta.choKaikaSkillId)) +
                                texts.collectibles.skillChoKaikaSuffix}
                            </option>
                          ) : null}
                        </select>
                      </label>
                      {!meta?.skillId && !meta?.choKaikaSkillId ? (
                        <div className="text-kumo-subtle text-xs">{currentSkillName ?? '—'}</div>
                      ) : null}
                      <div className="flex gap-2">
                        <Button size="sm" disabled={busy || maxed} onClick={() => void maxOneCard(row)}>
                          {maxed ? texts.collectibles.cardAlreadyMaxed : texts.collectibles.maxOneCard}
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => toggleCardEdit(row)}>
                          {texts.collectibles.cardEdit}
                        </Button>
                      </div>
                      {cardEditOpen.has(row.cardId)
                        ? (() => {
                            const d = cardEditDraft[row.cardId]
                            if (!d) return null
                            const levelNum = parseInt(d.level, 10)
                            const maxLevelNum = parseInt(d.maxLevel, 10)
                            const expNum = parseInt(d.exp, 10)
                            const stockNum = parseInt(d.digitalStock, 10)
                            const valid =
                              Number.isFinite(levelNum) &&
                              levelNum >= 1 &&
                              levelNum <= 100 &&
                              Number.isFinite(maxLevelNum) &&
                              maxLevelNum >= 10 &&
                              maxLevelNum <= 100 &&
                              Number.isFinite(expNum) &&
                              expNum >= 0 &&
                              Number.isFinite(stockNum) &&
                              stockNum >= 1 &&
                              stockNum <= 11
                            const setField = (patch: Partial<typeof d>) =>
                              setCardEditDraft((m) => ({ ...m, [row.cardId]: { ...d, ...patch } }))
                            return (
                              <div className="border-kumo-line mt-1 flex flex-col gap-2 border-t border-dashed pt-2">
                                <label className="flex items-center gap-2 text-xs">
                                  <span className="text-kumo-subtle w-24 shrink-0">
                                    {texts.collectibles.cardEditLevelLabel}
                                  </span>
                                  <Input
                                    className="h-9 flex-1"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={d.level}
                                    onChange={(e) => setField({ level: e.target.value })}
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-xs">
                                  <span className="text-kumo-subtle w-24 shrink-0">
                                    {texts.collectibles.cardEditMaxLevelLabel}
                                  </span>
                                  <Input
                                    className="h-9 flex-1"
                                    type="number"
                                    min={10}
                                    max={100}
                                    value={d.maxLevel}
                                    onChange={(e) => setField({ maxLevel: e.target.value })}
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-xs">
                                  <span className="text-kumo-subtle w-24 shrink-0">
                                    {texts.collectibles.cardEditExpLabel}
                                  </span>
                                  <Input
                                    className="h-9 flex-1"
                                    type="number"
                                    min={0}
                                    value={d.exp}
                                    onChange={(e) => setField({ exp: e.target.value })}
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-xs">
                                  <span className="text-kumo-subtle w-24 shrink-0">
                                    {texts.collectibles.cardEditStockLabel}
                                  </span>
                                  <Input
                                    className="h-9 flex-1"
                                    type="number"
                                    min={1}
                                    max={11}
                                    value={d.digitalStock}
                                    onChange={(e) => setField({ digitalStock: e.target.value })}
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-xs">
                                  <span className="text-kumo-subtle w-24 shrink-0">
                                    {texts.collectibles.currentSkillLabel}
                                  </span>
                                  <select
                                    value={d.skillId}
                                    onChange={(e) => setField({ skillId: parseInt(e.target.value, 10) || 0 })}
                                    className="border-kumo-line bg-kumo-base h-9 flex-1 rounded-lg border px-2 text-sm text-kumo-default"
                                  >
                                    {meta?.skillId ? (
                                      <option value={meta.skillId}>
                                        {(meta.skillName || String(meta.skillId)) +
                                          texts.collectibles.skillNormalSuffix}
                                      </option>
                                    ) : null}
                                    {meta?.choKaikaSkillId ? (
                                      <option value={meta.choKaikaSkillId}>
                                        {(meta.choKaikaSkillName || String(meta.choKaikaSkillId)) +
                                          texts.collectibles.skillChoKaikaSuffix}
                                      </option>
                                    ) : null}
                                  </select>
                                </label>
                                <Switch
                                  controlFirst={false}
                                  size="sm"
                                  label={texts.collectibles.cardEditKaikaLabel}
                                  checked={d.kaika}
                                  onCheckedChange={(on) =>
                                    setField({ kaika: on, choKaika: on ? d.choKaika : false })
                                  }
                                />
                                <Switch
                                  controlFirst={false}
                                  size="sm"
                                  label={texts.collectibles.cardEditChoKaikaLabel}
                                  checked={d.choKaika}
                                  onCheckedChange={(on) => setField({ choKaika: on, kaika: on ? true : d.kaika })}
                                />
                                {!valid ? (
                                  <div className="text-kumo-danger text-xs">
                                    {texts.collectibles.cardEditInvalidRange}
                                  </div>
                                ) : null}
                                <div className="flex gap-2">
                                  <Button size="sm" disabled={!valid || busy} onClick={() => void saveCardEdit(row)}>
                                    {texts.common.save}
                                  </Button>
                                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => toggleCardEdit(row)}>
                                    {texts.common.cancel}
                                  </Button>
                                </div>
                              </div>
                            )
                          })()
                        : null}
                    </div>
                  </div>
                )
              })}
            </div>
            {cardTotalPages > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safeCardPage <= 0}
                  onClick={() => setCardPage((p) => Math.max(0, p - 1))}
                >
                  {texts.common.previousPage}
                </Button>
                {cardPageItems.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ce-${idx}`} className="text-kumo-subtle px-2 text-sm">
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      size="sm"
                      variant={item === safeCardPage ? 'primary' : 'secondary'}
                      onClick={() => setCardPage(item)}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safeCardPage >= cardTotalPages - 1}
                  onClick={() => setCardPage((p) => Math.min(cardTotalPages - 1, p + 1))}
                >
                  {texts.common.nextPage}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-kumo-default mb-1 text-lg font-semibold">{texts.collectibles.deckTitle}</h2>
        <Text DANGEROUS_className="text-kumo-subtle mb-3 block text-sm">{texts.collectibles.deckHint}</Text>
        {deckRows.length === 0 ? (
          <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.collectibles.deckEmpty}</Text>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deckRows.map((deck) => {
              const draftVal = deckDraft[deck.deckId]
              const cardId1 = draftVal?.cardId1 ?? deck.cardId1
              const cardId2 = draftVal?.cardId2 ?? deck.cardId2
              const cardId3 = draftVal?.cardId3 ?? deck.cardId3
              const slots: [number, (v: number) => void][] = [
                [cardId1, (v) => setDeckDraft((d) => ({ ...d, [deck.deckId]: { cardId1: v, cardId2, cardId3 } }))],
                [cardId2, (v) => setDeckDraft((d) => ({ ...d, [deck.deckId]: { cardId1, cardId2: v, cardId3 } }))],
                [cardId3, (v) => setDeckDraft((d) => ({ ...d, [deck.deckId]: { cardId1, cardId2, cardId3: v } }))],
              ]
              const dirty = cardId1 !== deck.cardId1 || cardId2 !== deck.cardId2 || cardId3 !== deck.cardId3
              const hasDuplicate = cardId1 === cardId2 || cardId1 === cardId3 || cardId2 === cardId3
              return (
                <div
                  key={deck.deckId}
                  className="border-kumo-line bg-kumo-base flex flex-col gap-3 overflow-hidden rounded-lg border p-3 shadow-sm"
                >
                  <div className="text-kumo-default text-sm font-semibold">
                    {texts.collectibles.deckName(deck.deckId)}
                  </div>
                  {slots.map(([cardId, setSlot], idx) => {
                    const img = on9CardImageUrl(cardId, true)
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="border-kumo-line bg-kumo-recessed h-12 w-12 shrink-0 overflow-hidden rounded-md border">
                          {img ? (
                            <img
                              src={img}
                              crossOrigin={imgCross(img)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <label className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="text-kumo-subtle text-xs">{texts.collectibles.deckSlot(idx + 1)}</span>
                          <select
                            value={cardId}
                            onChange={(e) => setSlot(parseInt(e.target.value, 10) || 0)}
                            className="border-kumo-line bg-kumo-base h-9 rounded-lg border px-2 text-sm text-kumo-default"
                          >
                            <option value={0}>{texts.common.empty}</option>
                            {deckCardOptions.map((o) => (
                              <option key={o.itemId} value={o.itemId}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )
                  })}
                  {hasDuplicate ? (
                    <div className="text-kumo-danger text-xs">{texts.collectibles.deckDuplicateWarning}</div>
                  ) : null}
                  {dirty ? (
                    <Button
                      size="sm"
                      disabled={hasDuplicate || deckSavingId != null}
                      onClick={() => void saveDeck(deck)}
                    >
                      {deckSavingId === deck.deckId ? texts.collectibles.unlocking : texts.collectibles.saveDeck}
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
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
            aria-labelledby="on9-picker-title"
            className="border-kumo-line bg-kumo-base text-kumo-default flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-xl border shadow-2xl sm:rounded-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-kumo-line bg-kumo-tint flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h2 id="on9-picker-title" className="text-kumo-default text-lg font-semibold">
                  {label(activeRow.field)}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal} aria-label={texts.collectibles.close}>
                ✕
              </Button>
            </div>

            <div className="border-kumo-line bg-kumo-base shrink-0 border-b px-4 py-3">
              <div
                className={`grid items-end gap-3 ${
                  activeRow.field === 'cardId' ? 'md:grid-cols-[minmax(0,1fr)_200px_140px]' : ''
                }`}
              >
                <label className="flex flex-col gap-1">
                  <span className="text-kumo-subtle text-xs">{texts.collectibles.searchLabel}</span>
                  <Input
                    className="h-11"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder={texts.collectibles.searchPlaceholder}
                    autoFocus
                  />
                </label>
                {activeRow.field === 'cardId' ? (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-kumo-subtle text-xs">{texts.collectibles.character}</span>
                      <select
                        value={charaFilter}
                        onChange={(e) => setCharaFilter(e.target.value)}
                        className="border-kumo-line bg-kumo-base h-11 rounded-xl border px-3 text-sm text-kumo-default"
                      >
                        <option value="">{texts.collectibles.allCharacters}</option>
                        {cardCharaList.map((one) => (
                          <option key={one} value={one}>
                            {one}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-kumo-subtle text-xs">{texts.collectibles.rarity}</span>
                      <select
                        value={rarityFilter}
                        onChange={(e) => setRarityFilter(e.target.value)}
                        className="border-kumo-line bg-kumo-base h-11 rounded-xl border px-3 text-sm text-kumo-default"
                      >
                        <option value="">{texts.collectibles.allRarities}</option>
                        {cardRarityList.map((one) => (
                          <option key={one} value={one}>
                            {one}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </div>
              <div className="mt-3 rounded-xl border border-kumo-border bg-kumo-recessed px-3 py-3">
                <Switch
                  controlFirst={false}
                  label={texts.collectibles.experimentalCustomId}
                  checked={customIdEnabled}
                  onCheckedChange={(checked) => setCustomIdEnabled(Boolean(checked))}
                  size="base"
                />
                {customIdEnabled ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="flex flex-col gap-1">
                      <span className="text-kumo-subtle text-xs">{texts.collectibles.customIdLabel}</span>
                      <Input
                        className="h-11"
                        type="number"
                        min={0}
                        value={customIdInput}
                        onChange={(e) => setCustomIdInput(e.target.value)}
                        placeholder={texts.collectibles.customIdPlaceholder}
                      />
                    </label>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        className="h-11 px-4"
                        disabled={saving || unlockingId != null}
                        onClick={() => void applyCustomCollectibleId()}
                      >
                        {texts.collectibles.applyCustomId}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-kumo-recessed min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {filteredOptions.length === 0 ? (
                <Text DANGEROUS_className="text-kumo-subtle text-sm">{texts.collectibles.noMatches}</Text>
              ) : (
                <div
                  className={
                    on9CollectibleHasImage(activeRow.field)
                      ? activeRow.field === 'nameplateId'
                        ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
                        : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
                      : 'grid grid-cols-1 gap-2 sm:grid-cols-2'
                  }
                >
                  {pageSlice.map((o) => {
                    const isEquipped = equippedId === o.itemId
                    const owned = isOwned(activeRow.field, o.itemId)
                    const img = on9CollectibleImageUrl(activeRow.field, o.itemId, allItems)
                    const displayName = resolveName(activeRow.field, o.itemId, allItems, lookups)
                    const hasImg = on9CollectibleHasImage(activeRow.field)
                    const textOnly = TEXT_ONLY_PREVIEW_FIELDS.has(activeRow.field)
                    const isWidePreview = activeRow.field === 'nameplateId'
                    const showOwnBadge = UNLOCKABLE_FIELDS.has(activeRow.field)
                    return (
                      <Button
                        key={o.itemId}
                        type="button"
                        variant="secondary"
                        disabled={saving || unlockingId != null}
                        onClick={() => void selectCollectible(activeRow.field, o.itemId)}
                        className={`border-kumo-line !bg-kumo-base !text-kumo-default h-auto min-h-0 w-full flex-col items-stretch gap-0 overflow-hidden rounded-xl border p-0 text-left shadow-sm transition-colors hover:border-kumo-brand ${
                          isEquipped ? 'ring-kumo-brand ring-2 ring-offset-2 ring-offset-kumo-base' : ''
                        }`}
                      >
                        <div className="text-kumo-default border-kumo-line line-clamp-2 border-b px-3 py-2.5 text-sm font-medium">
                          {displayName}
                        </div>
                        {showOwnBadge ? (
                          <div className="border-kumo-line border-b px-3 py-2">
                            <span
                              className={`rounded-md px-2 py-1 text-xs ${
                                owned
                                  ? 'bg-kumo-success-tint text-kumo-success'
                                  : 'bg-kumo-warning-tint text-kumo-warning'
                              }`}
                            >
                              {owned
                                ? texts.collectibles.owned
                                : unlockingId === o.itemId
                                  ? texts.collectibles.unlocking
                                  : texts.collectibles.lockedClickToUnlock}
                            </span>
                          </div>
                        ) : null}
                        {textOnly || !hasImg ? (
                          <div className="border-kumo-line shrink-0 border-b" aria-hidden />
                        ) : (
                          <div
                            className={`bg-kumo-recessed flex items-center justify-center ${
                              isWidePreview ? 'min-h-[100px] px-2 py-3' : 'aspect-[3/4] min-h-[200px] max-h-[280px]'
                            }`}
                          >
                            {img ? (
                              <img
                                src={img}
                                crossOrigin={imgCross(img)}
                                alt=""
                                className={
                                  isWidePreview
                                    ? 'max-h-24 w-full object-contain object-center'
                                    : 'max-h-full max-w-full object-contain p-2'
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
              <div className="border-kumo-line bg-kumo-base flex shrink-0 flex-wrap items-center justify-center gap-1 border-t px-4 py-3">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 0 || saving || unlockingId != null}
                  onClick={() => setModalPage(0)}
                >
                  «
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 0 || saving || unlockingId != null}
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
                      disabled={saving || unlockingId != null}
                      onClick={() => setModalPage(item)}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages - 1 || saving || unlockingId != null}
                  onClick={() => setModalPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  {texts.common.nextPage}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages - 1 || saving || unlockingId != null}
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
