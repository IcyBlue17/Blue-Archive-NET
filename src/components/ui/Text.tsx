import { Typography } from 'antd'
import type { ComponentProps } from 'react'

type AntTextProps = ComponentProps<typeof Typography.Text>

export type TextProps = AntTextProps & {
  /** 需要跟随文本流排在同一行时打开（默认独占一行）。 */
  inline?: boolean
}

/**
 * antd 的 Typography.Text 是行内 span，而页面里绝大多数用法都当块级元素在使的
 * ——「标题一行、说明一行」，还带 mb-* 这类外边距。行内元素吃不下垂直外边距，
 * 相邻两段还会挤在同一行，所以这里默认块级，行内用法显式加 inline。
 */
export function Text({ inline, className, ...rest }: TextProps) {
  const cls = inline ? className : `block ${className ?? ''}`.trim()
  return <Typography.Text {...rest} className={cls} />
}
