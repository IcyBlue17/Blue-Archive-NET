import type { ReactNode } from 'react'
import { Card } from 'antd'

export type SectionCardProps = {
  /** 卡片标题。留空则不渲染标题栏，整张卡就是一块内容容器。 */
  title?: ReactNode
  /** 标题栏右侧的操作区。 */
  extra?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/**
 * 页面里最常出现的分节容器。包一层是为了把「标题 + 内容」这个固定搭配收敛成一个组件，
 * 免得每处都手写 Card 的 title/styles，也方便日后统一调间距。
 */
export function SectionCard({
  title,
  extra,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  return (
    <Card
      className={className}
      title={title}
      extra={extra}
      size="small"
      variant="outlined"
      styles={{ header: { fontWeight: 600 } }}
    >
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </Card>
  )
}
