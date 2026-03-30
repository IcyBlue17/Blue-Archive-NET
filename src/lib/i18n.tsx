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
    'settings.global.section': '地区',
    'settings.loadingUser': '正在加载用户信息…',
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
    'settings.global.section': 'Global & region',
    'settings.loadingUser': 'Loading user…',
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
