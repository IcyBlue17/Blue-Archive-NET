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
  loadOn9CatalogBundle,
  on9CollectibleHasImage,
  on9CollectibleImageUrl,
  type On9AllItems,
  type On9CatalogBundle,
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

const TEXT_ONLY_PREVIEW_FIELDS = new Set(['trophyId', 'characterVoiceNo'])
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

type On9CollectibleLoad = {
  lockedRows: On9UserboxSelectRow[]
  catalogBundle: On9CatalogBundle
  user: Record<string, unknown>
  draft: Record<string, number>
  allItems: On9AllItems
  lookups: On9NameLookups
  ownedCards: number[]
  ownedCharacters: number[]
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
            // characterVoiceNo has no asset catalog to expand into — it always uses its fixed range
            if (f === 'characterVoiceNo') {
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
      }
    },
  })

  useEffect(() => {
    if (!loadQuery.data) return
    setAllItems(loadQuery.data.allItems)
    setUser(loadQuery.data.user)
    setCatalogBundle(loadQuery.data.catalogBundle)
    setLookups(loadQuery.data.lookups)
    setOwnedCards(loadQuery.data.ownedCards)
    setOwnedCharacters(loadQuery.data.ownedCharacters)
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
    const out: Record<number, { charaName: string; rarity: string }> = {}
    for (const [id, row] of Object.entries(raw)) {
      const num = parseInt(id, 10)
      if (!Number.isNaN(num)) {
        out[num] = {
          charaName: cleanText(row.charaName),
          rarity: cleanText(row.rarity),
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
    setErr(null)
    if (UNLOCKABLE_FIELDS.has(modalField) && customId > 0 && !isOwned(modalField, customId)) {
      await unlockAndSelect(modalField, customId)
      return
    }
    setDraft((d) => ({ ...d, [modalField]: customId }))
    closeModal()
  }, [closeModal, customIdInput, isOwned, modalField, texts.collectibles, unlockAndSelect])

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

  const pageItems = useMemo(() => buildPaginationItems(safePage, totalPages), [safePage, totalPages])

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
