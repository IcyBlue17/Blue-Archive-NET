/* eslint-disable react-refresh/only-export-components -- provider + hook in one module */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { APP_NAME } from './config'

type Locale = 'zh' | 'en'

const messages: Record<Locale, Record<string, string>> = {
  zh: {
    login: '登录',
    register: '注册',
    email: '邮箱 / 用户名',
    password: '密码',
    username: '用户名',
    submit: '提交',
    back: '返回',
    resetPassword: '重置密码',
    verifyEmail: '验证邮箱',
    home: '首页',
    dashboard: '仪表盘',
    settings: '设置',
    ranking: '排行榜',
    team: '战队',
    friends: '好友',
    cards: 'Aime卡配置',
    setup: '配置指南',
    transfer: '数据迁移',
    collectibles: '收藏品',
    pictures: 'maimai相片',
    support: '社区',
    admin: '管理',
    logout: '退出登录',
    themeLight: '浅色',
    themeDark: '深色',
    language: '语言',
    'settings.tab.profile': '资料',
    'settings.tab.global': '全局游戏',
    'settings.tab.chu3': 'CHUNITHM',
    'settings.tab.mai2': 'maimaiDX',
    'settings.tab.ongeki': '音击',
    'settings.tab.wacca': 'WACCA',
    'settings.profile.section': '个人资料',
    'settings.profile.displayName': '显示名',
    'settings.profile.bio': '简介',
    'settings.profile.save': '保存',
    'settings.profile.email': '邮箱',
    'settings.profile.oauthSection': '已关联的第三方账号',
    'settings.profile.oauthEmpty': '尚未关联任何账号。',
    'settings.profile.passkeySection': '通行密钥（Passkey）',
    'settings.profile.passkeyEmpty': '尚未注册通行密钥。',
    'settings.global.section': '地区',
    'settings.loadingUser': '正在加载用户信息…',
    'auth.dividerOr': '或',
    'auth.passkeyLogin': '使用通行密钥登录',
    'auth.passkeyNoToken': '服务器未返回登录令牌',
    'auth.passkeyError': '通行密钥操作失败',
    'auth.passkeyAdd': '添加通行密钥',
    'auth.passkeyRemove': '移除',
    'auth.passkeyAdded': '已添加通行密钥',
    'auth.passkeyRemoved': '已移除通行密钥',
    'auth.oauthCallbackWorking': '正在完成登录…',
    'auth.oauthCallbackMissing': '缺少登录参数，将返回登录页。',
    'auth.oauthUnlink': '解除关联',
    'auth.oauthUnlinked': '已解除关联',
    'auth.oauthContinue': '使用 {name} 继续',
    'auth.oauthNotConfiguredHint': '需在后端配置该渠道的 client-id 后可用',
    'auth.oauthBindNeedToken': '请先登录后再绑定',
    'auth.registerOAuthIntro': '可用下列方式注册（服务端未配置时为灰色）；也可使用邮箱注册。',
  },
  en: {
    login: 'Log in',
    register: 'Register',
    email: 'Email / Username',
    password: 'Password',
    username: 'Username',
    submit: 'Submit',
    back: 'Back',
    resetPassword: 'Reset password',
    verifyEmail: 'Verify email',
    home: 'Home',
    dashboard: 'Dashboard',
    settings: 'Settings',
    ranking: 'Ranking',
    team: 'Team',
    friends: 'Friends',
    cards: 'Cards',
    setup: 'Setup',
    transfer: 'Transfer',
    collectibles: 'Collectibles',
    pictures: 'maimai Photos',
    support: 'Community',
    admin: 'Admin',
    logout: 'Log out',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    'settings.tab.profile': 'Profile',
    'settings.tab.global': 'Global',
    'settings.tab.chu3': 'CHUNITHM',
    'settings.tab.mai2': 'maimaiDX',
    'settings.tab.ongeki': 'Ongeki',
    'settings.tab.wacca': 'WACCA',
    'settings.profile.section': 'Profile',
    'settings.profile.displayName': 'Display name',
    'settings.profile.bio': 'Bio',
    'settings.profile.save': 'Save',
    'settings.profile.email': 'Email',
    'settings.profile.oauthSection': 'Linked accounts',
    'settings.profile.oauthEmpty': 'No linked accounts yet.',
    'settings.profile.passkeySection': 'Passkeys',
    'settings.profile.passkeyEmpty': 'No passkeys yet.',
    'settings.global.section': 'Global & region',
    'settings.loadingUser': 'Loading user…',
    'auth.dividerOr': 'or',
    'auth.passkeyLogin': 'Sign in with passkey',
    'auth.passkeyNoToken': 'Server did not return a login token',
    'auth.passkeyError': 'Passkey action failed',
    'auth.passkeyAdd': 'Add passkey',
    'auth.passkeyRemove': 'Remove',
    'auth.passkeyAdded': 'Passkey added',
    'auth.passkeyRemoved': 'Passkey removed',
    'auth.oauthCallbackWorking': 'Completing sign-in…',
    'auth.oauthCallbackMissing': 'Missing sign-in parameters. Redirecting to login.',
    'auth.oauthUnlink': 'Unlink',
    'auth.oauthUnlinked': 'Account unlinked',
    'auth.oauthContinue': 'Continue with {name}',
    'auth.oauthNotConfiguredHint': 'Enable by configuring OAuth client IDs on the server',
    'auth.oauthBindNeedToken': 'Sign in first to link an account',
    'auth.registerOAuthIntro': 'Sign up with a provider below (greyed out until OAuth is configured), or use email.',
  },
}

type I18nContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const s = localStorage.getItem('locale') as Locale | null
    return s === 'en' || s === 'zh' ? s : 'zh'
  })

  const setLocalePersist = useCallback((l: Locale) => {
    setLocale(l)
    localStorage.setItem('locale', l)
  }, [])

  const t = useCallback(
    (key: string) => {
      if (key === 'appName') return APP_NAME
      return messages[locale][key] ?? messages.en[key] ?? key
    },
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale: setLocalePersist, t }),
    [locale, setLocalePersist, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
