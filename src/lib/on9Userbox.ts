import type { On9AllItems } from './on9Assets'

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
] as const

export type On9AppearanceField = (typeof ON9_APPEARANCE_FIELD_ORDER)[number]

export const ON9_FIELD_ALL_ITEMS_KEY: Record<On9AppearanceField, string> = {
  cardId: 'card',
  characterId: 'chara',
  nameplateId: 'nameplate',
  trophyId: 'trophy',
  // characterVoiceNo has no asset catalog — it's just a small integer slot number
  characterVoiceNo: '',
}

// characterVoiceNo picker always offers this fixed range, plus the equipped value if it's outside it
const ON9_CHARACTER_VOICE_NO_MAX = 9

function itemName(allItems: On9AllItems, key: string, itemId: number): string {
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

function characterVoiceNoRow(equippedId: number): On9UserboxSelectRow {
  const ids = new Set(Array.from({ length: ON9_CHARACTER_VOICE_NO_MAX + 1 }, (_, n) => n))
  if (equippedId >= 0) ids.add(equippedId)
  const sorted = [...ids].sort((a, b) => a - b)
  return {
    allItemsKey: '',
    field: 'characterVoiceNo',
    options: sorted.map((itemId) => ({ itemId, name: String(itemId) })),
  }
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

  return [
    idListRow('cardId', cardIds, num('cardId'), allItems),
    idListRow('characterId', ownedCharacterIds, num('characterId'), allItems),
    idListRow('nameplateId', itemIdsOfKind(ON9_IKINDS.namePlate), num('nameplateId'), allItems),
    idListRow('trophyId', itemIdsOfKind(ON9_IKINDS.trophy), num('trophyId'), allItems),
    characterVoiceNoRow(num('characterVoiceNo')),
  ]
}
