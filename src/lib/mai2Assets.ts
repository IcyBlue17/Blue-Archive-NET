import { imgUrl } from '@/lib/imgSign'

export type Mai2JsonEntry = { id: number; name: string }
export type Mai2AllItemMeta = {
  name?: string
  imageFile?: string | null
  smallImageFile?: string | null
  genre?: string
  genreId?: number
  colorName?: string
  rareType?: string
  isDefault?: boolean
  [key: string]: unknown
}
export type Mai2AllItems = Record<string, Record<string, Mai2AllItemMeta>>

const resolvedCache = new Map<string, unknown>()
const inflight = new Map<string, Promise<unknown>>()

function fixBase(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/g, '')
  return `/${s.replace(/^\/+|\/+$/g, '')}`
}

const BASE = fixBase(import.meta.env.VITE_MAI2_ASSET_BASE ?? '')

function assetPath(one: string): string {
  return BASE ? `${BASE}/${one}` : `/${one}`
}

export function mai2AssetUrl(one: string): string {
  return imgUrl(assetPath(one))
}

export function padMai2Id6(id: number): string {
  return String(Math.max(0, Math.floor(id))).padStart(6, '0')
}

// Jackets key on musicId % 10000 (same as the game's ui_jacket_* bundles);
// utage ids >= 100000 share the low-id jacket.
export function mai2JacketId(musicId: number): number {
  return Math.max(0, musicId) % 10000
}

export function mai2JacketImageUrl(musicId: number, small = false): string | null {
  const jid = mai2JacketId(musicId)
  if (jid <= 0) return null
  const suffix = small ? '_S' : ''
  return mai2AssetUrl(`musicJacket/UI_Jacket_${padMai2Id6(jid)}${suffix}.webp`)
}

export function mai2CollectibleImageUrl(
  field: string,
  itemId: number,
  _allItems?: Mai2AllItems,
  small = false,
): string | null {
  if (itemId <= 0) return null
  const suffix = small ? '_S' : ''
  switch (field) {
    case 'plateId':
      return mai2AssetUrl(`nameplate/UI_Plate_${padMai2Id6(itemId)}.webp`)
    case 'iconId':
      return mai2AssetUrl(`icon/UI_Icon_${padMai2Id6(itemId)}.webp`)
    case 'frameId':
      return mai2AssetUrl(`frame/UI_Frame_${padMai2Id6(itemId)}${suffix}.webp`)
    case 'characterId':
      return mai2AssetUrl(`chara/UI_Chara_${padMai2Id6(itemId)}.webp`)
    case 'partnerId':
      return mai2AssetUrl(`partner/UI_Partner_${padMai2Id6(itemId)}.webp`)
    default:
      return null
  }
}

export function mai2CollectibleHasImage(field: string): boolean {
  return (
    field === 'plateId' ||
    field === 'iconId' ||
    field === 'frameId' ||
    field === 'characterId' ||
    field === 'partnerId'
  )
}

export async function fetchMai2AssetJson<T = Mai2JsonEntry[]>(jsonFile: string): Promise<T> {
  if (resolvedCache.has(jsonFile)) return resolvedCache.get(jsonFile) as T
  let p = inflight.get(jsonFile) as Promise<T> | undefined
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(mai2AssetUrl(jsonFile))
        if (!res.ok) throw new Error(`mai2-assets: failed to load ${jsonFile} (${res.status})`)
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

export type Mai2CatalogBundle = {
  plate: Mai2JsonEntry[]
  title: Mai2JsonEntry[]
  icon: Mai2JsonEntry[]
  frame: Mai2JsonEntry[]
  chara: Mai2JsonEntry[]
  partner: Mai2JsonEntry[]
}

export async function loadMai2CatalogBundle(): Promise<Mai2CatalogBundle> {
  const [plate, title, icon, frame, chara, partner] = await Promise.all([
    fetchMai2AssetJson('plate.json'),
    fetchMai2AssetJson('title.json'),
    fetchMai2AssetJson('icon.json'),
    fetchMai2AssetJson('frame.json'),
    fetchMai2AssetJson('chara.json'),
    fetchMai2AssetJson('partner.json'),
  ])
  return { plate, title, icon, frame, chara, partner }
}

export type Mai2NameLookups = {
  plate: Map<number, string>
  title: Map<number, string>
  icon: Map<number, string>
  frame: Map<number, string>
  chara: Map<number, string>
  partner: Map<number, string>
}

export function bundleToMai2Lookups(bundle: Mai2CatalogBundle): Mai2NameLookups {
  const toMap = (rows: Mai2JsonEntry[]) => new Map(rows.map((r) => [r.id, r.name]))
  return {
    plate: toMap(bundle.plate),
    title: toMap(bundle.title),
    icon: toMap(bundle.icon),
    frame: toMap(bundle.frame),
    chara: toMap(bundle.chara),
    partner: toMap(bundle.partner),
  }
}

export function buildMai2CatalogOptions(
  field: string,
  bundle: Mai2CatalogBundle,
): { itemId: number; name: string }[] {
  const rows =
    field === 'plateId'
      ? bundle.plate
      : field === 'titleId'
        ? bundle.title
        : field === 'iconId'
          ? bundle.icon
          : field === 'frameId'
            ? bundle.frame
            : field === 'characterId' || field === 'charaSlot'
              ? bundle.chara
              : field === 'partnerId'
                ? bundle.partner
                : []
  return rows.map((e) => ({ itemId: e.id, name: e.name }))
}
