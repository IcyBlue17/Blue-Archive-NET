import type { ReactNode } from 'react'
import { Switch } from 'antd'
import type { SwitchProps } from 'antd'

export type LabeledSwitchProps = SwitchProps & {
  label?: ReactNode
  /** 文字在前（默认）还是在后。 */
  labelFirst?: boolean
}

/**
 * antd 的 Switch 不带文案，而设置项里几乎都要配一行说明。
 * 包一层顺便把整块做成 <label>，点文字也能切换——移动端这点很重要。
 */
export function LabeledSwitch({ label, labelFirst = true, ...rest }: LabeledSwitchProps) {
  if (!label) return <Switch {...rest} />
  const text = <span className="text-app-default text-sm">{label}</span>
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      {labelFirst ? text : null}
      <Switch {...rest} />
      {labelFirst ? null : text}
    </label>
  )
}
