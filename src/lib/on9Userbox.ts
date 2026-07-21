import { isOn9EquippableChara, type On9AllItems } from './on9Assets'

export interface On9UserItem {
  itemKind: number
  itemId: number
  stock?: number
}

export interface On9UserboxSelectRow {
  allItemsKey: string
  field: string
  options: { itemId: number; name: string }[]
}

// ongeki_user_item.itemKind ordinals (OgkItemType)
export const ON9_IKINDS = {
  card: 1,
  namePlate: 2,
  trophy: 3,
} as const

export const ON9_APPEARANCE_FIELD_ORDER = [
  'cardId',
  'characterId',
  'nameplateId',
  'trophyId',
  'characterVoiceNo',
  'systemVoiceId',
] as const

export type On9AppearanceField = (typeof ON9_APPEARANCE_FIELD_ORDER)[number]

export const ON9_FIELD_ALL_ITEMS_KEY: Record<On9AppearanceField, string> = {
  cardId: 'card',
  characterId: 'chara',
  nameplateId: 'nameplate',
  trophyId: 'trophy',
  // characterVoiceNo stores a ProfileVoice id (charaId*10 + voiceNo), named in the profileVoice catalog
  characterVoiceNo: 'profileVoice',
  // systemVoiceId stores a SystemVoice id (one per navigator, charaId 1000-1016), named in systemVoice
  systemVoiceId: 'systemVoice',
}

function itemName(allItems: On9AllItems, key: string, itemId: number): string {
  if (itemId === 0) return '—'
  if (!key) return String(itemId)
  const n = allItems[key]?.[String(itemId)]?.name
  return n ?? `(unknown ${itemId})`
}

export function withOn9EquippedIfMissing(
  row: On9UserboxSelectRow,
  currentId: number,
  allItems: On9AllItems,
): On9UserboxSelectRow {
  if (currentId <= 0 || row.options.some((o) => o.itemId === currentId)) return row
  return {
    ...row,
    options: [
      { itemId: currentId, name: itemName(allItems, row.allItemsKey, currentId) },
      ...row.options,
    ],
  }
}

function idListRow(
  field: On9AppearanceField,
  ids: number[],
  equippedId: number,
  allItems: On9AllItems,
): On9UserboxSelectRow {
  const key = ON9_FIELD_ALL_ITEMS_KEY[field]
  const set = new Set(ids.filter((n) => Number.isFinite(n) && n > 0))
  if (equippedId > 0) set.add(equippedId)
  const sorted = [...set].sort((a, b) => a - b)
  return {
    allItemsKey: key,
    field,
    options: sorted.map((itemId) => ({ itemId, name: itemName(allItems, key, itemId) })),
  }
}

// A ProfileVoice id (charaId*10 + voiceNo). Voices belong to a character, so the picker only
// offers the equipped character's voices (by real name), plus "—" (none) and the current value.
function characterVoiceNoRow(
  equippedVoiceId: number,
  equippedCharaId: number,
  allItems: On9AllItems,
): On9UserboxSelectRow {
  const voices = allItems.profileVoice ?? {}
  const options = Object.entries(voices)
    .filter(([, meta]) => Number((meta as Record<string, unknown>)?.charaId) === equippedCharaId)
    .map(([id, meta]) => ({ itemId: parseInt(id, 10), name: meta?.name ?? id }))
    .filter((o) => Number.isFinite(o.itemId))
    .sort((a, b) => a.itemId - b.itemId)
  const rows = [{ itemId: 0, name: '—' }, ...options]
  if (equippedVoiceId > 0 && !rows.some((r) => r.itemId === equippedVoiceId)) {
    rows.push({
      itemId: equippedVoiceId,
      name: voices[String(equippedVoiceId)]?.name ?? String(equippedVoiceId),
    })
  }
  return { allItemsKey: 'profileVoice', field: 'characterVoiceNo', options: rows }
}

// The system/UI announcer voice (systemVoiceId). Unlike ProfileVoice it is NOT tied to the equipped
// navigator — the player may pick any navigator's voice to narrate the UI — so the picker offers the
// full SystemVoice catalog (one entry per navigator, charaId 1000-1016), plus "—" (none) and the
// current value if it is not in the catalog.
function systemVoiceIdRow(
  equippedVoiceId: number,
  allItems: On9AllItems,
): On9UserboxSelectRow {
  const voices = allItems.systemVoice ?? {}
  const options = Object.entries(voices)
    .map(([id, meta]) => ({ itemId: parseInt(id, 10), name: meta?.name ?? id }))
    .filter((o) => Number.isFinite(o.itemId))
    .sort((a, b) => a.itemId - b.itemId)
  const rows = [{ itemId: 0, name: '—' }, ...options]
  if (equippedVoiceId > 0 && !rows.some((r) => r.itemId === equippedVoiceId)) {
    rows.push({
      itemId: equippedVoiceId,
      name: voices[String(equippedVoiceId)]?.name ?? String(equippedVoiceId),
    })
  }
  return { allItemsKey: 'systemVoice', field: 'systemVoiceId', options: rows }
}

export function buildOn9AppearanceSelectRows(
  userItems: On9UserItem[],
  ownedCardIds: number[],
  ownedCharacterIds: number[],
  user: Record<string, unknown>,
  allItems: On9AllItems,
): On9UserboxSelectRow[] {
  const num = (f: string) => {
    const v = user[f]
    if (typeof v === 'number') return v
    if (typeof v === 'string' && v !== '') return parseInt(v, 10) || 0
    return 0
  }

  const itemIdsOfKind = (kind: number) =>
    userItems.filter((x) => x.itemKind === kind).map((x) => x.itemId)

  // cards live in ongeki_user_card; itemKind=1 rows may also exist — union both
  const cardIds = [...ownedCardIds, ...itemIdsOfKind(ON9_IKINDS.card)]

  // only navigator charas are equippable — anything else crashes the game at logout
  const equippableCharaIds = ownedCharacterIds.filter((id) =>
    isOn9EquippableChara(id, allItems.chara?.[String(id)]),
  )

  return [
    idListRow('cardId', cardIds, num('cardId'), allItems),
    idListRow('characterId', equippableCharaIds, num('characterId'), allItems),
    idListRow('nameplateId', itemIdsOfKind(ON9_IKINDS.namePlate), num('nameplateId'), allItems),
    idListRow('trophyId', itemIdsOfKind(ON9_IKINDS.trophy), num('trophyId'), allItems),
    characterVoiceNoRow(num('characterVoiceNo'), num('characterId'), allItems),
    systemVoiceIdRow(num('systemVoiceId'), allItems),
  ]
}
