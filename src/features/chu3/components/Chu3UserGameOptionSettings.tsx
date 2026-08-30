import { css, type Theme } from '@emotion/react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Collapse, Input, Select, Slider, Switch } from 'antd'
import * as gameApi from '@/api/game'
import { getAppTexts } from '@/content/texts'
import {
  CHU3_OPTION_FIELDS,
  CHU3_OPTION_GROUP_ORDER,
  chu3OptionInt,
  formatChu3Offset,
  formatChu3Speed,
  formatChu3Volume,
  parseChu3UserOption,
  sliderMax,
  sliderMin,
  type Chu3OptionField,
  type Chu3OptionGroupId,
} from '@/lib/chu3UserOption'
import { qk } from '@/lib/query'
import type { SettingFieldLocale } from '@/lib/settingsFieldLabels'
import type { Chu3UserGameOption } from '@/lib/types'
import { Text } from '@/components/ui/Text'
import { SkeletonBox } from '@/components/ui/Skeleton'

const sectionTitle = (theme: Theme) => css`
  margin: 0 0 ${theme.marginXS}px;
  color: ${theme.colorText};
  font-size: ${theme.fontSizeLG}px;
  font-weight: 600;
`

const groupTitle = (theme: Theme) => css`
  margin: 0 0 ${theme.marginSM}px;
  color: ${theme.colorText};
  font-size: ${theme.fontSize}px;
  font-weight: 600;
`

const hint = (theme: Theme) => css`
  margin: 0 0 ${theme.marginMD}px;
  color: ${theme.colorTextSecondary};
  font-size: ${theme.fontSizeSM}px;
`

const errorText = (theme: Theme) => css`
  margin: 0 0 ${theme.marginSM}px;
  color: ${theme.colorError};
  font-size: ${theme.fontSizeSM}px;
`

const stack = (gap: keyof Theme) => (theme: Theme) => css`
  display: flex;
  flex-direction: column;
  gap: ${String(theme[gap])}px;
`

const fieldCol = (theme: Theme) => css`
  display: flex;
  flex-direction: column;
  gap: ${theme.marginXXS}px;
  max-width: 36rem;
`

const fieldHead = css`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const switchRow = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const labelCol = css`
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
`

const nameText = (theme: Theme) => css`
  color: ${theme.colorText};
  font-size: ${theme.fontSize}px;
  font-weight: 500;
`

const descText = (theme: Theme) => css`
  color: ${theme.colorTextSecondary};
  font-size: ${theme.fontSizeSM}px;
`

const valueText = (theme: Theme) => css`
  flex-shrink: 0;
  color: ${theme.colorPrimary};
  font-family: ${theme.fontFamilyCode};
  font-size: ${theme.fontSizeSM}px;
  font-variant-numeric: tabular-nums;
`

const numberInput = css`
  max-width: 20rem;
`

const alertGap = (theme: Theme) => css`
  margin-bottom: ${theme.marginMD}px;
`

const extraCollapse = (theme: Theme) => css`
  margin-top: ${theme.marginLG}px;
`

const skeletonStack = (theme: Theme) => css`
  display: flex;
  flex-direction: column;
  gap: ${theme.marginSM}px;
`

function fieldLabel(
  copy: ReturnType<typeof getAppTexts>,
  key: string,
): { name: string; desc: string } {
  const row = copy.chu3UserOption.fields[key as keyof typeof copy.chu3UserOption.fields]
  if (row) return row
  return { name: key, desc: '' }
}

function choiceList(copy: ReturnType<typeof getAppTexts>, name: string | undefined): string[] {
  if (!name) return []
  const lists = copy.chu3UserOption.choices
  return (lists[name as keyof typeof lists] ?? []) as string[]
}

function formatSliderValue(field: Chu3OptionField, value: number): string {
  if (field.key === 'speed' || field.key === 'speed_120') return formatChu3Speed(value)
  if (field.key.includes('TimingOffset')) {
    const signed = formatChu3Offset(value)
    return Number(signed) > 0 ? `+${signed}` : signed
  }
  if (field.key === 'headphone') return formatChu3Volume(value, field.max ?? 60)
  if (field.control === 'slider' && (field.max ?? 0) <= 11) return String(value)
  return String(value)
}

function FieldCopy({ name, desc }: { name: string; desc: string }) {
  return (
    <label css={labelCol}>
      <span css={nameText}>{name}</span>
      {desc ? <span css={descText}>{desc}</span> : null}
    </label>
  )
}

function OptionRow({
  field,
  value,
  locale,
  disabled,
  onSave,
}: {
  field: Chu3OptionField
  value: number
  locale: SettingFieldLocale
  disabled: boolean
  onSave: (key: string, next: number) => Promise<void>
}) {
  const copy = getAppTexts(locale)
  const { name, desc } = fieldLabel(copy, field.key)
  const [draft, setDraft] = useState(String(value))
  const [slide, setSlide] = useState(value)
  const choices = choiceList(copy, field.choices)

  useEffect(() => {
    setDraft(String(value))
    setSlide(value)
  }, [value])

  if (field.control === 'switch') {
    return (
      <div css={switchRow}>
        <FieldCopy name={name} desc={desc} />
        <Switch
          checked={value !== 0}
          disabled={disabled}
          onChange={(checked) => void onSave(field.key, checked ? 1 : 0)}
        />
      </div>
    )
  }

  if (field.control === 'select') {
    const maxChoice = Math.max(choices.length - 1, value, 0)
    const options = Array.from({ length: maxChoice + 1 }, (_, i) => ({
      value: i,
      label: choices[i] ?? `${copy.chu3UserOption.valueLabel} ${i}`,
    }))
    return (
      <div css={fieldCol}>
        <FieldCopy name={name} desc={desc} />
        <Select
          aria-label={name}
          value={value}
          disabled={disabled}
          onChange={(next) => void onSave(field.key, Number(next))}
          options={options}
        />
      </div>
    )
  }

  if (field.control === 'number') {
    return (
      <div css={fieldCol}>
        <FieldCopy name={name} desc={desc} />
        <Input
          type="number"
          css={numberInput}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = chu3OptionInt(draft, value)
            if (next !== value) void onSave(field.key, next)
            else setDraft(String(value))
          }}
        />
      </div>
    )
  }

  const min = sliderMin(field, slide)
  const max = sliderMax(field, slide)
  return (
    <div css={fieldCol}>
      <div css={fieldHead}>
        <FieldCopy name={name} desc={desc} />
        <span css={valueText}>{formatSliderValue(field, slide)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        value={slide}
        disabled={disabled}
        tooltip={{ formatter: (v) => formatSliderValue(field, v ?? slide) }}
        onChange={(next) => {
          if (typeof next === 'number') setSlide(next)
        }}
        onChangeComplete={(next) => {
          if (typeof next === 'number' && next !== value) void onSave(field.key, next)
        }}
      />
    </div>
  )
}

function groupFields(id: Chu3OptionGroupId) {
  return CHU3_OPTION_FIELDS.filter((f) => f.group === id)
}

export function Chu3UserGameOptionSettings({ locale }: { locale: SettingFieldLocale }) {
  const copy = getAppTexts(locale)
  const qc = useQueryClient()
  const [saving, setSaving] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const optQuery = useQuery({
    queryKey: qk.chu3UserOption,
    queryFn: async () => parseChu3UserOption(await gameApi.userOption('chu3')),
  })

  const options = optQuery.data ?? null
  const grouped = useMemo(() => {
    return CHU3_OPTION_GROUP_ORDER.map((id) => ({
      id,
      fields: groupFields(id),
    }))
  }, [])

  async function saveField(field: string, value: number) {
    setSaving(field)
    setErr(null)
    try {
      await gameApi.userOptionSet('chu3', field, value)
      if (field !== 'optionSet' && chu3OptionInt(options?.optionSet) !== 3) {
        await gameApi.userOptionSet('chu3', 'optionSet', 3)
      }
      await qc.invalidateQueries({ queryKey: qk.chu3UserOption })
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.chu3UserOption.failed)
    } finally {
      setSaving(null)
    }
  }

  if (optQuery.isPending && !optQuery.data) {
    return (
      <section>
        <h3 css={sectionTitle}>{copy.chu3UserOption.section}</h3>
        <div css={skeletonStack}>
          <SkeletonBox className="h-11 w-full rounded-lg" />
          <SkeletonBox className="h-11 w-full rounded-lg" />
          <SkeletonBox className="h-11 w-4/5 rounded-lg" />
        </div>
      </section>
    )
  }

  if (optQuery.error) {
    return (
      <section>
        <h3 css={sectionTitle}>{copy.chu3UserOption.section}</h3>
        <Text css={errorText}>
          {optQuery.error instanceof Error ? optQuery.error.message : copy.chu3UserOption.failed}
        </Text>
      </section>
    )
  }

  if (!options) {
    return (
      <section>
        <h3 css={sectionTitle}>{copy.chu3UserOption.section}</h3>
        <Text css={hint}>{copy.chu3UserOption.empty}</Text>
      </section>
    )
  }

  const optionSet = chu3OptionInt(options.optionSet)
  const mainGroups = grouped.filter((g) => g.id !== 'extra')
  const extraGroup = grouped.find((g) => g.id === 'extra')

  function renderFields(fields: Chu3OptionField[], data: Chu3UserGameOption) {
    return (
      <div css={stack('marginMD')}>
        {fields.map((field) => (
          <OptionRow
            key={field.key}
            field={field}
            value={chu3OptionInt(data[field.key])}
            locale={locale}
            disabled={saving !== null}
            onSave={saveField}
          />
        ))}
      </div>
    )
  }

  return (
    <section>
      <h3 css={sectionTitle}>{copy.chu3UserOption.section}</h3>
      <Text css={hint}>{copy.chu3UserOption.hint}</Text>
      {optionSet !== 3 ? (
        <Alert
          css={alertGap}
          type="warning"
          showIcon
          message={copy.chu3UserOption.presetWarning}
        />
      ) : null}
      {err ? <Text css={errorText}>{err}</Text> : null}

      <div css={stack('marginLG')}>
        {mainGroups.map((group) => (
          <div key={group.id}>
            <h4 css={groupTitle}>{copy.chu3UserOption.groups[group.id]}</h4>
            {renderFields(group.fields, options)}
          </div>
        ))}
      </div>

      {extraGroup ? (
        <Collapse
          css={extraCollapse}
          items={[
            {
              key: 'extra',
              label: copy.chu3UserOption.groups.extra,
              children: renderFields(extraGroup.fields, options),
            },
          ]}
        />
      ) : null}
    </section>
  )
}
