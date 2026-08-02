import { useMemo } from 'react'
import { App } from 'antd'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
}

/**
 * 全站统一的轻提示入口，底层是 antd 的 notification（走 App 上下文，
 * 因此能吃到 ConfigProvider 的主题与 locale，不用静态方法）。
 *
 * 保持 `add({ title, description, variant })` 这个调用形状——它在十几处调用点里
 * 已经用顺手了，换成 antd 原生的 message/notification 分裂调用只会徒增噪音。
 */
export function useToast() {
  const { notification } = App.useApp()

  return useMemo(
    () => ({
      add({ title, description, variant = 'info' }: ToastInput) {
        notification.open({
          type: variant,
          title,
          description,
          placement: 'topRight',
          duration: variant === 'error' ? 6 : 3,
        })
      },
    }),
    [notification],
  )
}
