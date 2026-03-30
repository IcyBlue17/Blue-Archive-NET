/**
 * EdgeOne / Worker 风格图片鉴权函数示例
 *
 * 用途：
 * - 部署在 IMAGE_HOST（如 img.icybit.cn）
 * - 读取 cookie 里的 Aqua JWT
 * - 可选先做一次本地 HS256 验签
 * - 再向 Aqua `/api/v2/user/me` 确认 session 仍有效
 * - 合法则回源拉取静态图片；不合法直接 403
 *
 * 需要的环境变量：
 * - IMAGE_ORIGIN=https://your-s3-or-origin.example.com
 * - APP_ORIGIN=https://blue-archive.icybit.cn
 * - AQUA_VERIFY_URL=https://blue-archive.icybit.cn/api/v2/user/me
 * - JWT_COOKIE_NAME=aqua_jwt
 * - AQUA_JWT_SECRET=...            // 可选；不填则只走远端校验
 */

const text1 = new TextEncoder()

function res403(msg1 = 'Forbidden') {
  return new Response(msg1, { status: 403 })
}

function addCors1(res1, appOrigin1) {
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

function b64urlToBytes1(raw1) {
  const s1 = raw1.replace(/-/g, '+').replace(/_/g, '/')
  const pad1 = s1.length % 4 === 0 ? '' : '='.repeat(4 - (s1.length % 4))
  const bin1 = atob(s1 + pad1)
  return Uint8Array.from(bin1, (ch1) => ch1.charCodeAt(0))
}

function safeEq1(a1, b1) {
  if (a1.length !== b1.length) return false
  let diff1 = 0
  for (let i = 0; i < a1.length; i += 1) diff1 |= a1.charCodeAt(i) ^ b1.charCodeAt(i)
  return diff1 === 0
}

async function verifyJwtHs256_1(jwt1, secret1) {
  const parts1 = String(jwt1 || '').split('.')
  if (parts1.length !== 3) return false
  const [head1, body1, sign1] = parts1
  const headJson1 = JSON.parse(new TextDecoder().decode(b64urlToBytes1(head1)))
  const bodyJson1 = JSON.parse(new TextDecoder().decode(b64urlToBytes1(body1)))
  if (headJson1.alg !== 'HS256') return false
  if (bodyJson1.exp && Date.now() >= Number(bodyJson1.exp) * 1000) return false
  if (bodyJson1.nbf && Date.now() < Number(bodyJson1.nbf) * 1000) return false

  const key1 = await crypto.subtle.importKey(
    'raw',
    text1.encode(secret1),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig1 = await crypto.subtle.sign('HMAC', key1, text1.encode(`${head1}.${body1}`))
  const sigB64_1 = btoa(String.fromCharCode(...new Uint8Array(sig1)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return safeEq1(sigB64_1, sign1)
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

function buildOriginUrl1(req1, origin1) {
  const inUrl1 = new URL(req1.url)
  const outUrl1 = new URL(inUrl1.pathname + inUrl1.search, origin1)
  return outUrl1
}

export default {
  async fetch(req1, env1) {
    const appOrigin1 = String(env1.APP_ORIGIN || '').trim()
    const cookieName1 = String(env1.JWT_COOKIE_NAME || 'aqua_jwt').trim() || 'aqua_jwt'
    const imageOrigin1 = String(env1.IMAGE_ORIGIN || '').trim()
    const verifyUrl1 = String(env1.AQUA_VERIFY_URL || '').trim()
    const secret1 = String(env1.AQUA_JWT_SECRET || '').trim()

    if (!appOrigin1 || !imageOrigin1 || !verifyUrl1) {
      return new Response('Edge config missing', { status: 500 })
    }

    if (req1.method === 'OPTIONS') {
      return addCors1(new Response(null, { status: 204 }), appOrigin1)
    }

    if (req1.method !== 'GET' && req1.method !== 'HEAD') {
      return addCors1(new Response('Method Not Allowed', { status: 405 }), appOrigin1)
    }

    const origin1 = String(req1.headers.get('origin') || '').trim()
    if (origin1 && origin1 !== appOrigin1) {
      return addCors1(res403('Bad origin'), appOrigin1)
    }

    const reqUrl1 = new URL(req1.url)
    if (reqUrl1.pathname.startsWith('/api/')) {
      return addCors1(new Response('Not Found', { status: 404 }), appOrigin1)
    }

    const token1 = cookieMap1(req1.headers.get('cookie')).get(cookieName1)
    if (!token1) return addCors1(res403('Missing JWT cookie'), appOrigin1)

    if (secret1) {
      const pass1 = await verifyJwtHs256_1(token1, secret1).catch(() => false)
      if (!pass1) return addCors1(res403('Bad JWT'), appOrigin1)
    }

    const remoteOk1 = await verifyRemote1(token1, verifyUrl1).catch(() => false)
    if (!remoteOk1) return addCors1(res403('Session expired'), appOrigin1)

    const originUrl1 = buildOriginUrl1(req1, imageOrigin1)
    const res1 = await fetch(originUrl1.toString(), {
      method: req1.method,
      headers: {
        Accept: req1.headers.get('accept') || '*/*',
      },
    })

    return addCors1(res1, appOrigin1)
  },
}
