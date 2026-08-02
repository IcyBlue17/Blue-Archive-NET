import moment from 'moment'

export type DateLocale = 'zh' | 'en'

/** 街机侧写库时间没有时区标记，按日本时间解读。 */
const GAME_UTC_OFFSET_MINUTES = 9 * 60

/** 后端各处返回的无时区时间串的可能写法。 */
const NAIVE_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY/MM/DD HH:mm:ss',
  'YYYY-MM-DD HH:mm',
  'YYYY-MM-DDTHH:mm',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  // 后端也会给不补零的写法（2026-8-2 9:05），严格解析下要单列出来
  'YYYY-M-D H:m:s',
  'YYYY-M-DTH:m:s',
  'YYYY/M/D H:m:s',
  'YYYY-M-D H:m',
  'YYYY-M-D',
  'YYYY/M/D',
]

/**
 * 输出格式写死，不走 moment 的 locale 注册表。
 *
 * 之前用 `.locale('zh-cn').format('L LTS')`，locale 数据确实进了产物，但打包后
 * 注册和调用未必落在同一个 moment 实例上，线上中文界面照样输出成 `07/31/2026 11:32:09 PM`。
 * 只有两种语言、格式需求也简单，直接写死最省事也最可控。
 */
const DATETIME_FORMAT: Record<DateLocale, string> = {
  zh: 'YYYY/MM/DD HH:mm:ss',
  en: 'MM/DD/YYYY h:mm:ss A',
}

const DATE_FORMAT: Record<DateLocale, string> = {
  zh: 'YYYY/MM/DD',
  en: 'MM/DD/YYYY',
}

function pick(map: Record<DateLocale, string>, locale: DateLocale): string {
  return map[locale] ?? map.zh
}

function hasTimezone(raw: string): boolean {
  return /(z|[+-]\d{2}:?\d{2})$/i.test(raw.trim())
}

/**
 * 按格式表解析无时区的时间串。
 *
 * 先严格匹配；严格模式下 moment 要求补零与否和 token 宽度完全一致
 * （`m` 不吃 `05`、`mm` 不吃 `5`），而后端两种写法都出现过，
 * 所以失败后再按同一批格式非严格解析一次——仍然锚定格式，不退化成 new Date()。
 */
function parseNaive(s: string): moment.Moment {
  const strict = moment(s, NAIVE_FORMATS, true)
  return strict.isValid() ? strict : moment(s, NAIVE_FORMATS, false)
}

/**
 * 解析一个时间值。带时区标记的按标记走；不带的一律当本地时间。
 * 解析不出来返回 null，交给调用方决定兜底显示。
 */
function parse(raw: string | number | undefined | null): moment.Moment | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    const m = moment(raw)
    return m.isValid() ? m : null
  }
  const s = String(raw).trim()
  if (!s) return null
  const m = hasTimezone(s) ? moment.parseZone(s).local() : parseNaive(s)
  return m.isValid() ? m : null
}

/**
 * 解析游戏侧的时间：无时区标记时按 JST 理解，再换算到本地时区显示。
 * `utcOffset(offset, true)` 是「这串墙上时间属于该时区」，而不是做偏移换算。
 */
function parseGameTime(raw: string | undefined | null): moment.Moment | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  if (hasTimezone(s)) {
    const m = moment.parseZone(s)
    return m.isValid() ? m.local() : null
  }
  const m = parseNaive(s)
  return m.isValid() ? m.utcOffset(GAME_UTC_OFFSET_MINUTES, true).local() : null
}

/** 日期 + 时间。 */
export function formatDateTime(raw: string | number | undefined | null, locale: DateLocale): string {
  const m = parse(raw)
  if (!m) return raw ? String(raw) : '—'
  return m.format(pick(DATETIME_FORMAT, locale))
}

/** 只要日期。 */
export function formatDate(raw: string | number | undefined | null, locale: DateLocale): string {
  const m = parse(raw)
  if (!m) return raw ? String(raw) : '—'
  return m.format(pick(DATE_FORMAT, locale))
}

/** 写库时间（playlog 等），无时区时按 JST 解读。 */
export function formatGameDateTime(raw: string | undefined | null, locale: DateLocale): string {
  const m = parseGameTime(raw)
  if (!m) return raw ? String(raw) : '—'
  return m.format(pick(DATETIME_FORMAT, locale))
}

/** 表单要的「本地当前时刻」，格式 YYYY-MM-DDTHH:mm:ss（后端约定，不带时区）。 */
export function nowLocalIso(): string {
  return moment().format('YYYY-MM-DDTHH:mm:ss')
}

/** 往前推 n 天的日期串（YYYY-MM-DD），用于趋势图裁剪窗口。 */
export function daysAgoDate(days: number): string {
  return moment().subtract(days, 'days').format('YYYY-MM-DD')
}

/** 排序用的时间戳，解析不出来时排到最后。 */
export function timeValue(raw: string | number | undefined | null): number {
  return parse(raw)?.valueOf() ?? 0
}
