/**
 * Alibaba Cloud ESA 图片鉴权函数示例
 *
 * 说明：
 * - 部署在图片域名上，例如 img.icybit.cn
 * - 前端直接请求这个图片域名，并自动带共享域 cookie
 * - ESA 边缘函数读取 cookie 里的 Aqua JWT
 * - 可选先本地做一次 HS256 验签
 * - 再请求 Aqua `/api/v2/user/me` 确认 session 仍有效
 * - 后端验活结果会缓存在 ESA POP，避免每张图都打一遍后端
 * - 鉴权通过后回源取图，并附带 `X-YUANSHEN: NIUBI`
 *
 * 官方依据：
 * - ESA 支持标准 Web Service Worker API：
 *   https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/edge-functions-overview
 * - `export default { async fetch(request) {} }` 示例：
 *   https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/return-to-1-html-page
 * - ESA `fetch` API 与浏览器环境相近：
 *   https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/api-documentation
 *
 * 直接改下面 CFG 常量即可，不依赖控制台环境变量。
 */

const text1 = new TextEncoder()
const CFG = {
  // 你的图片真实源站，比如 S3 / OSS / COS / Nginx
  IMAGE_ORIGIN: 'https://your-origin.example.com',
  // 你的主站 origin
  APP_ORIGIN: 'https://blue-archive.icybit.cn',
  // Aqua 用户态校验接口
  AQUA_VERIFY_URL: 'https://blue-archive.icybit.cn/api/v2/user/me',
  // 前端同步出来的 JWT cookie 名
  JWT_COOKIE_NAME: 'aqua_jwt',
  // 可选：Aqua 的 aqua-net.jwt.secret；不知道就留空，只走远端 session 校验
  AQUA_JWT_SECRET: '',
  // 后端验活结果的边缘缓存秒数。36000 = 10 小时
  AUTH_CACHE_TTL: 36000,
}

function bad1(msg1, code1 = 403) {
  return new Response(msg1, { status: code1 })
}

function withCors1(res1, appOrigin1) {
  const head1 = new Headers(res1.headers)
  head1.set('Access-Control-Allow-Origin', appOrigin1)
  head1.set('Access-Control-Allow-Credentials', 'true')
  head1.append('Vary', 'Origin')
  head1.append('Vary', 'Cookie')
  return new Response(res1.body, {
    status: res1.status,
    statusText: res1.statusText,
    headers: head1,
  })
}

function cookieMap1(raw1) {
  const map1 = new Map()
  for (const part1 of String(raw1 || '').split(';')) {
    const pos1 = part1.indexOf('=')
    if (pos1 <= 0) continue
    const k1 = part1.slice(0, pos1).trim()
    const v1 = part1.slice(pos1 + 1).trim()
    if (k1) map1.set(k1, decodeURIComponent(v1))
  }
  return map1
}

function b64urlBytes1(raw1) {
  const s1 = raw1.replace(/-/g, '+').replace(/_/g, '/')
  const pad1 = s1.length % 4 === 0 ? '' : '='.repeat(4 - (s1.length % 4))
  const bin1 = atob(s1 + pad1)
  return Uint8Array.from(bin1, (ch1) => ch1.charCodeAt(0))
}

function eq1(a1, b1) {
  if (a1.length !== b1.length) return false
  let diff1 = 0
  for (let i = 0; i < a1.length; i += 1) diff1 |= a1.charCodeAt(i) ^ b1.charCodeAt(i)
  return diff1 === 0
}

function hex1(buf1) {
  return Array.from(new Uint8Array(buf1))
    .map((one) => one.toString(16).padStart(2, '0'))
    .join('')
}

function jwtKeyBytes1(secret1) {
  const raw1 = text1.encode(secret1)
  if (raw1.length >= 32) return raw1
  const out1 = new Uint8Array(32)
  out1.set(raw1)
  return out1
}

function hmacName1(alg1) {
  if (alg1 === 'HS256') return 'SHA-256'
  if (alg1 === 'HS384') return 'SHA-384'
  if (alg1 === 'HS512') return 'SHA-512'
  return ''
}

async function verifyJwt1(jwt1, secret1) {
  const parts1 = String(jwt1 || '').split('.')
  if (parts1.length !== 3) return false
  const [head1, body1, sign1] = parts1
  const headJson1 = JSON.parse(new TextDecoder().decode(b64urlBytes1(head1)))
  const bodyJson1 = JSON.parse(new TextDecoder().decode(b64urlBytes1(body1)))
  const hashName1 = hmacName1(String(headJson1.alg || ''))
  if (!hashName1) return false
  if (bodyJson1.exp && Date.now() >= Number(bodyJson1.exp) * 1000) return false
  if (bodyJson1.nbf && Date.now() < Number(bodyJson1.nbf) * 1000) return false

  const key1 = await crypto.subtle.importKey(
    'raw',
    jwtKeyBytes1(secret1),
    { name: 'HMAC', hash: hashName1 },
    false,
    ['sign'],
  )
  const sig1 = await crypto.subtle.sign('HMAC', key1, text1.encode(`${head1}.${body1}`))
  const sigB64_1 = btoa(String.fromCharCode(...new Uint8Array(sig1)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return eq1(sigB64_1, sign1)
}

async function verifyRemote1(token1, verifyUrl1) {
  const url1 = new URL(verifyUrl1)
  url1.searchParams.set('token', token1)
  const res1 = await fetch(url1.toString(), {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  return res1.ok
}

async function authCacheKey1(token1, verifyUrl1) {
  const raw1 = `${verifyUrl1}|${token1}`
  const hash1 = await crypto.subtle.digest('SHA-256', text1.encode(raw1))
  return `http://esa-auth-cache.local/${hex1(hash1)}`
}

async function authCacheGet1(token1, verifyUrl1) {
  const key1 = await authCacheKey1(token1, verifyUrl1)
  const hit1 = await cache.get(key1)
  return !!hit1
}

async function authCachePut1(token1, verifyUrl1, ttl1) {
  const key1 = await authCacheKey1(token1, verifyUrl1)
  await cache.put(
    key1,
    new Response('ok', {
      headers: {
        'cache-control': `max-age=${ttl1}`,
      },
    }),
  )
}

function originPath1(path1) {
  if (path1 === '/chu3-assets') return '/chu3'
  if (path1.startsWith('/chu3-assets/')) return `/chu3/${path1.slice('/chu3-assets/'.length)}`
  return path1
}

function originUrl1(req1, imageOrigin1) {
  const reqUrl1 = new URL(req1.url)
  const base1 = new URL(imageOrigin1)
  const root1 = base1.pathname.endsWith('/') ? base1.pathname.slice(0, -1) : base1.pathname
  base1.pathname = `${root1}${originPath1(reqUrl1.pathname)}`
  base1.search = reqUrl1.search
  return base1
}

function needJwt1(path1) {
  return path1 === '/chu3-assets' || path1.startsWith('/chu3-assets/')
}

function allowPublic1(path1) {
  return path1 === '/blue-archive-logo.png' || path1 === '/favicon.png'
}

async function handle1(req1) {
  const appOrigin1 = String(CFG.APP_ORIGIN || '').trim()
  const imageOrigin1 = String(CFG.IMAGE_ORIGIN || '').trim()
  const verifyUrl1 = String(CFG.AQUA_VERIFY_URL || '').trim()
  const cookieName1 = String(CFG.JWT_COOKIE_NAME || 'aqua_jwt').trim() || 'aqua_jwt'
  const secret1 = String(CFG.AQUA_JWT_SECRET || '').trim()
  const cacheTtl1 = Math.max(0, Number(CFG.AUTH_CACHE_TTL || 0) || 0)

  if (!appOrigin1 || !imageOrigin1 || !verifyUrl1) {
    return new Response('ESA env missing', { status: 500 })
  }

  if (req1.method === 'OPTIONS') {
    return withCors1(new Response(null, { status: 204 }), appOrigin1)
  }

  if (req1.method !== 'GET' && req1.method !== 'HEAD') {
    return withCors1(new Response('Method Not Allowed', { status: 405 }), appOrigin1)
  }

  const origin1 = String(req1.headers.get('origin') || '').trim()
  if (origin1 && origin1 !== appOrigin1) {
    return withCors1(bad1('Bad origin'), appOrigin1)
  }

  const reqUrl1 = new URL(req1.url)
  if (reqUrl1.pathname.startsWith('/api/')) {
    return withCors1(bad1('Not Found', 404), appOrigin1)
  }

  if (!needJwt1(reqUrl1.pathname) && !allowPublic1(reqUrl1.pathname)) {
    return withCors1(bad1('YOU ARE NOT FROM ABYDOS'), appOrigin1)
  }

  if (needJwt1(reqUrl1.pathname)) {
    const token1 = cookieMap1(req1.headers.get('cookie')).get(cookieName1)
    if (!token1) return withCors1(bad1('YOU ARE NOT FROM ABYDOS'), appOrigin1)

    const hit1 = cacheTtl1 > 0
      ? await authCacheGet1(token1, verifyUrl1).catch(() => false)
      : false
    if (!hit1) {
      if (secret1) {
        await verifyJwt1(token1, secret1).catch(() => false)
      }
      const remoteOk1 = await verifyRemote1(token1, verifyUrl1).catch(() => false)
      if (!remoteOk1) return withCors1(bad1('Session expired'), appOrigin1)
      if (cacheTtl1 > 0) {
        await authCachePut1(token1, verifyUrl1, cacheTtl1).catch(() => undefined)
      }
    }
  }

  const res1 = await fetch(originUrl1(req1, imageOrigin1).toString(), {
    method: req1.method,
    headers: {
      Accept: req1.headers.get('accept') || '*/*',
      'X-YUANSHEN': 'NIUBI',
    },
  })

  return withCors1(res1, appOrigin1)
}

export default {
  async fetch(request) {
    return handle1(request)
  },
}
