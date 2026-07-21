import { imgUrl } from './imgSign'

export type On9JsonEntry = { id: number; name: string }
export type On9CardJsonEntry = On9JsonEntry & {
  charaId?: number
  charaName?: string
  nickName?: string
  rarity?: string
  attribute?: string
  school?: string
  gakunen?: string
  skillName?: string
  choKaikaSkillName?: string
  versionKey?: string
  imageFile?: string
  smallImageFile?: string
}
export type On9AllItemMeta = {
  name?: string
  imageFile?: string | null
  smallImageFile?: string | null
  graphicCardId?: number | string
  rarity?: string
  charaName?: string
  isCommunicationTarget?: boolean
  [key: string]: unknown
}
export type On9AllItems = Record<string, Record<string, On9AllItemMeta>>

// Only navigator charas (IsCommunicationTarget=true in Chara.xml, 1000-1016 as of SDDT 1.51) ship
// the ANM_Chara_* story model that the game's logout scene instantiates without a null check —
// equipping any other characterId crashes the game at logout. The flag comes from chara.json /
// all-items.json; fall back to the known ID range when reading data built before the flag existed.
export function isOn9EquippableChara(
  charaId: number,
  meta?: { isCommunicationTarget?: unknown } | null,
): boolean {
  const flag = meta?.isCommunicationTarget
  if (typeof flag === 'boolean') return flag
  return charaId >= 1000 && charaId <= 1016
}

const resolvedCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

function fixBase(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/g, '')
  return `/${s.replace(/^\/+|\/+$/g, '')}`
}

const BASE = fixBase(import.meta.env.VITE_ON9_ASSET_BASE ?? '')

function assetPath(one: string): string {
  return BASE ? `${BASE}/${one}` : `/${one}`
}

export function on9AssetUrl(one: string): string {
  return imgUrl(assetPath(one))
}

export function padOn9Id6(id: number): string {
  return String(Math.max(0, Math.floor(id))).padStart(6, '0')
}

export function on9CardImageUrl(cardId: number, small = false): string | null {
  if (cardId <= 0) return null
  const suffix = small ? '_S' : ''
  return on9AssetUrl(`card/UI_Card_${padOn9Id6(cardId)}${suffix}.webp`)
}

export function on9NameplateImageUrl(plateId: number): string | null {
  if (plateId <= 0) return null
  return on9AssetUrl(`nameplate/UI_UserPlate_${padOn9Id6(plateId)}.webp`)
}

function charaGraphicCardId(charaId: number, allItems?: On9AllItems): number {
  const row = allItems?.chara?.[String(charaId)]
  const raw = row?.graphicCardId
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
  return Number.isFinite(n) ? n : 0
}

export function on9CollectibleImageUrl(
  field: string,
  itemId: number,
  allItems?: On9AllItems,
  small = false,
): string | null {
  if (itemId <= 0) return null
  switch (field) {
    case 'cardId':
      return on9CardImageUrl(itemId, small)
    case 'nameplateId':
      return on9NameplateImageUrl(itemId)
    case 'characterId': {
      const cardId = charaGraphicCardId(itemId, allItems)
      return cardId > 0 ? on9CardImageUrl(cardId, small) : null
    }
    default:
      return null
  }
}

export function on9CollectibleHasImage(field: string): boolean {
  return field === 'cardId' || field === 'nameplateId' || field === 'characterId'
}

export async function fetchOn9AssetJson<T = On9JsonEntry[]>(jsonFile: string): Promise<T> {
  if (resolvedCache.has(jsonFile)) return resolvedCache.get(jsonFile) as T
  let p = inflight.get(jsonFile) as Promise<T> | undefined
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(on9AssetUrl(jsonFile))
        if (!res.ok) throw new Error(`on9-assets: failed to load ${jsonFile} (${res.status})`)
        const data = (await res.json()) as T
        resolvedCache.set(jsonFile, data)
        return data
      } finally {
        inflight.delete(jsonFile)
      }
    })()
    inflight.set(jsonFile, p)
  }
  return p
}

export type On9CharaJsonEntry = On9JsonEntry & { isCommunicationTarget?: boolean }

export type On9CatalogBundle = {
  card: On9CardJsonEntry[]
  nameplate: On9JsonEntry[]
  trophy: On9JsonEntry[]
  chara: On9CharaJsonEntry[]
}

export async function loadOn9CatalogBundle(): Promise<On9CatalogBundle> {
  const [card, nameplate, trophy, chara] = await Promise.all([
    fetchOn9AssetJson<On9CardJsonEntry[]>('card.json'),
    fetchOn9AssetJson('nameplate.json'),
    fetchOn9AssetJson('trophy.json'),
    fetchOn9AssetJson<On9CharaJsonEntry[]>('chara.json'),
  ])
  return { card, nameplate, trophy, chara }
}

export type On9NameLookups = {
  card: Map<number, string>
  nameplate: Map<number, string>
  trophy: Map<number, string>
  chara: Map<number, string>
}

export function bundleToOn9Lookups(bundle: On9CatalogBundle): On9NameLookups {
  const toMap = (rows: On9JsonEntry[]) => new Map(rows.map((r) => [r.id, r.name]))
  return {
    card: toMap(bundle.card),
    nameplate: toMap(bundle.nameplate),
    trophy: toMap(bundle.trophy),
    chara: toMap(bundle.chara),
  }
}

export function buildOn9CatalogOptions(
  field: string,
  bundle: On9CatalogBundle,
): { itemId: number; name: string }[] {
  const rows =
    field === 'cardId'
      ? bundle.card
      : field === 'nameplateId'
        ? bundle.nameplate
        : field === 'trophyId'
          ? bundle.trophy
          : field === 'characterId'
            ? bundle.chara.filter((e) => isOn9EquippableChara(e.id, e))
            : []
  return rows.map((e) => ({ itemId: e.id, name: e.name }))
}
