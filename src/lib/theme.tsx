import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd'
import type { GlobalToken, ThemeConfig } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import { ThemeProvider as EmotionThemeProvider } from '@emotion/react'
import { useI18n } from '@/lib/i18n'

type Mode = 'light' | 'dark'

type ThemeContextValue = {
  theme: Mode
  setTheme: (t: Mode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE = 'aquanet-theme'

/**
 * app.css 里的 --app-* 语义色板 → antd design token。
 * antd 是唯一颜色来源，Tailwind 工具类与 Emotion 都从这里取值，三边不会各说各话。
 */
const TOKEN_BRIDGE = {
  '--app-default': 'colorText',
  '--app-subtle': 'colorTextSecondary',
  '--app-strong': 'colorTextHeading',
  '--app-brand': 'colorPrimary',
  '--app-danger': 'colorError',
  '--app-success': 'colorSuccess',
  '--app-warning': 'colorWarning',
  '--app-line': 'colorBorderSecondary',
  '--app-border': 'colorBorder',
  '--app-base': 'colorBgContainer',
  '--app-surface': 'colorBgLayout',
  '--app-elevated': 'colorBgElevated',
  '--app-recessed': 'colorFillQuaternary',
  '--app-fill': 'colorFillSecondary',
  '--app-fill-hover': 'colorFill',
  '--app-tint': 'colorPrimaryBg',
  '--app-warning-tint': 'colorWarningBg',
  '--app-success-tint': 'colorSuccessBg',
  '--app-danger-tint': 'colorErrorBg',
} as const satisfies Record<string, keyof GlobalToken>

function themeConfig(mode: Mode): ThemeConfig {
  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      borderRadius: 10,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', " +
        "'Microsoft YaHei', Roboto, 'Helvetica Neue', Arial, sans-serif",
    },
    components: {
      // 底色统一走我们自己的 --app-* 体系，避免 Layout 再刷一层不同的灰。
      Layout: { bodyBg: 'transparent', siderBg: 'transparent', headerBg: 'transparent' },
      Card: { bodyPadding: 16 },
    },
  }
}

/**
 * 把 antd 解析后的 token 写进 :root，供 Tailwind 的 --app-* 工具类使用；
 * 同一份 token 再交给 Emotion 当 theme。
 *
 * useToken() 返回的是字面色值而非 var() 引用，所以能直接赋给自定义属性。
 */
function TokenBridge({ mode, children }: { mode: Mode; children: ReactNode }) {
  const { token } = antdTheme.useToken()

  useLayoutEffect(() => {
    const root = document.documentElement
    for (const [cssVar, tokenKey] of Object.entries(TOKEN_BRIDGE)) {
      root.style.setProperty(cssVar, String(token[tokenKey]))
    }
  }, [token])

  const emotionTheme = useMemo(() => ({ ...token, mode }), [token, mode])

  return <EmotionThemeProvider theme={emotionTheme}>{children}</EmotionThemeProvider>
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n()
  const [theme, setThemeState] = useState<Mode>(() => {
    const s = localStorage.getItem(STORAGE) as Mode | null
    if (s === 'light' || s === 'dark') return s
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      return 'dark'
    return 'light'
  })

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    if (theme === 'dark') root.setAttribute('data-mode', 'dark')
    else root.removeAttribute('data-mode')
    // 让原生控件（滚动条、表单默认样式）跟着换色
    root.style.colorScheme = theme
    localStorage.setItem(STORAGE, theme)
  }, [theme])

  const setTheme = useCallback((t: Mode) => setThemeState(t), [])
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle])

  return (
    <ThemeContext.Provider value={value}>
      <StyleProvider layer>
        <ConfigProvider theme={themeConfig(theme)} locale={locale === 'en' ? enUS : zhCN}>
          <TokenBridge mode={theme}>
            {/* component={false}：不额外套 div，只提供 message / notification / modal 上下文 */}
            <AntApp component={false}>{children}</AntApp>
          </TokenBridge>
        </ConfigProvider>
      </StyleProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme outside ThemeProvider')
  return ctx
}
