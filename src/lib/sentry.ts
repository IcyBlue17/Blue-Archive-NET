import { useEffect } from 'react'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { apiBase } from './config'


/**
 * Sentry 的 DSN 是公开的客户端标识（本来就会打进 bundle），不是密钥，
 * 所以直接内置默认值；要换项目或本地关掉，用 VITE_SENTRY_DSN 覆盖即可。
 */
const DEFAULT_DSN =
  'https://e5f366c0ea9f5e81b9343863d07d70ae@o4511804929802240.ingest.us.sentry.io/4511841489911808'

const rawDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
const DSN = rawDsn === undefined ? DEFAULT_DSN : rawDsn.trim()

function sampleRate(raw: unknown, fallback: number): number {
  const n = Number.parseFloat(String(raw ?? ''))
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback
}

/**
 * 本站几乎所有接口都把认证 token 塞在 query string 里（?token=…），
 * 面包屑、请求 URL、span 描述都会带上它，原样上报等于把令牌送进 Sentry。
 * 所有出站字符串统一过一遍这个替换。
 */
function scrubToken(value: string): string {
  return value.replace(/([?&](?:token|access_token)=)[^&#\s]*/gi, '$1[Filtered]')
}

function scrubDeep(value: unknown): unknown {
  if (typeof value === 'string') return scrubToken(value)
  if (Array.isArray(value)) return value.map(scrubDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubDeep(v)
    return out
  }
  return value
}

/**
 * 追踪传播目标：同源路径 + 本地 + 后端 API 域。
 * 后端 CORS 已放行 `sentry-trace` / `baggage`，所以能串起前后端的分布式追踪。
 */
function tracePropagationTargets(): (string | RegExp)[] {
  const targets: (string | RegExp)[] = [/^\//, 'localhost']
  try {
    const base = apiBase()
    if (base) targets.push(new URL(base).origin)
  } catch {
    // apiBase 解析不出来就只保留默认项
  }
  return targets
}

export function initSentry() {
  // 没配 DSN 就完全不初始化：本地开发不该往线上打点
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // 把错误挂到具体构建上，回溯时能直接对到 commit
    release: __BUILD_INFO__.commit || undefined,
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: sampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 1.0),
    tracePropagationTargets: tracePropagationTargets(),
    enableLogs: true,

    beforeBreadcrumb(crumb) {
      if (crumb.data) crumb.data = scrubDeep(crumb.data) as Record<string, unknown>
      if (typeof crumb.message === 'string') crumb.message = scrubToken(crumb.message)
      return crumb
    },
    beforeSend(event) {
      return scrubDeep(event) as typeof event
    },
    beforeSendTransaction(event) {
      return scrubDeep(event) as typeof event
    },
  })
}
