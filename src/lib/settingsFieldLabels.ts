export type SettingFieldLocale = 'zh' | 'en'
import { getAppTexts } from '../content/texts'

export function settingFieldLabel(key: string, locale: SettingFieldLocale) {
  const row = (getAppTexts(locale).settingFields as Record<string, { name: string; desc: string }>)[key]
  if (!row) {
    return { name: key, desc: '' }
  }
  return row
}
