
import { Button } from '@cloudflare/kumo/components/button'
import { Input } from '@cloudflare/kumo/components/input'
import { Text } from '@cloudflare/kumo/components/text'
import { getAppTexts } from '../../content/texts'

const MAX_SEGA_USERNAME_LENGTH = 8

const SEGA_SPECIAL_SYMBOLS = [
  '．', '・', '：', '；', '？', '！', '～', '／',
  '＋', '－', '×', '÷', '＝', '♂', '♀', '∀',
  '＃', '＆', '＊', '＠', '☆', '○', '◎', '◇',
  '□', '△', '▽', '♪', '†', '‡', 'Σ', 'α',
  'β', 'γ', 'θ', 'φ', 'ψ', 'ω', 'Д', 'ё',
] as const

export function normalizeSegaUsername(raw: string) {
  const fullWidth = Array.from(raw).map((char) => {
    if (char === ' ') return '　'
    const code = char.charCodeAt(0)
    if (code >= 33 && code <= 126) return String.fromCharCode(code + 65248)
    return char
  }).join('')
  return Array.from(fullWidth).slice(0, MAX_SEGA_USERNAME_LENGTH).join('')
}

export function SegaUsernameEditor({
  value,
  onChange,
  onSave,
  saving = false,
  saveDisabled = false,
  label,
  locale,
}: {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  saving?: boolean
  saveDisabled?: boolean
  label: string
  locale: 'zh' | 'en'
}) {
  const copy = getAppTexts(locale)
  const length = Array.from(value).length

  function appendSymbol(symbol: string) {
    onChange(normalizeSegaUsername(value + symbol))
  }

  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={value}
            maxLength={MAX_SEGA_USERNAME_LENGTH}
            onChange={(e) => onChange(normalizeSegaUsername(e.target.value))}
            placeholder={copy.segaUsernameEditor.placeholder}
          />
          <Button size="sm" variant="secondary" disabled={saving || saveDisabled} onClick={onSave}>
            {copy.segaUsernameEditor.save}
          </Button>
        </div>
      </label>

      <Text DANGEROUS_className="text-kumo-subtle text-sm">
        {copy.segaUsernameEditor.helper(length, MAX_SEGA_USERNAME_LENGTH)}
      </Text>

      <div className="grid max-w-3xl grid-cols-4 gap-2 sm:grid-cols-8">
        {SEGA_SPECIAL_SYMBOLS.map((symbol) => (
          <button
            key={symbol}
            type="button"
            className="border-kumo-line bg-kumo-base hover:bg-kumo-recessed text-kumo-default rounded-md border px-3 py-2 text-lg leading-none"
            onClick={() => appendSymbol(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  )
}
