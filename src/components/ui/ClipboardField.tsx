import { Typography } from 'antd'

/**
 * 只读 + 一键复制的取值展示（keychip、绑定码这类）。
 * 复制按钮与提示文案由 antd 自带并跟随 ConfigProvider 的 locale，无需自备文案。
 */
export function ClipboardField({ text, className }: { text: string; className?: string }) {
  return (
    <Typography.Paragraph
      copyable={{ text }}
      className={`bg-app-recessed border-app-line !mb-0 rounded-lg border px-3 py-2 font-mono text-sm break-all ${className ?? ''}`.trim()}
    >
      {text}
    </Typography.Paragraph>
  )
}
