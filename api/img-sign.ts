import { AwsClient } from 'aws4fetch'

export const config = {
  runtime: 'edge',
}

const passHeaders1 = [
  'cache-control',
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
  'expires',
]

function splitCsv1(raw?: string | null): string[] {
  const out1: string[] = []
  for (const part1 of String(raw ?? '').split(',')) {
    const s1 = part1.trim()
    if (!s1) continue
    try {
      out1.push(host1(new URL(s1).host))
    } catch {
      out1.push(host1(s1))
    }
  }
  return out1
}

function host1(raw: string): string {
  return raw.trim().toLowerCase().replace(/:\d+$/, '')
}

function sameHost1(a: string, b: string): boolean {
  return host1(a) === host1(b)
}

function makeBase1(req: Request, reqUrl: URL): string {
  const proto1 = req.headers.get('x-forwarded-proto') || reqUrl.protocol.replace(':', '')
  const hostRaw1 = req.headers.get('x-forwarded-host') || req.headers.get('host') || reqUrl.host
  return `${proto1}://${hostRaw1}`
}

function makeTarget1(raw: string, req: Request, reqUrl: URL): URL {
  const base1 = makeBase1(req, reqUrl)
  const url1 = new URL(raw, base1)
  if (!/^https?:$/i.test(url1.protocol)) throw new Error('only http/https image url is allowed')
  if (url1.pathname === '/_img' || url1.pathname === '/api/img-sign') throw new Error('recursive image sign is blocked')
  return url1
}

function canVisit1(target: URL, req: Request, allowHosts1: string[]): boolean {
  const selfHost1 = req.headers.get('x-forwarded-host') || req.headers.get('host') || target.host
  if (sameHost1(target.host, selfHost1)) return true
  return allowHosts1.some((it) => sameHost1(target.host, it))
}

function wantAws1(target: URL, awsHosts1: string[]): boolean {
  return awsHosts1.some((it) => sameHost1(target.host, it))
}

function awsCli1(): AwsClient | null {
  const accessKeyId = (process.env.IMAGE_SIGN_AWS_ACCESS_KEY_ID || '').trim()
  const secretAccessKey = (process.env.IMAGE_SIGN_AWS_SECRET_ACCESS_KEY || '').trim()
  if (!accessKeyId || !secretAccessKey) return null
  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    sessionToken: (process.env.IMAGE_SIGN_AWS_SESSION_TOKEN || '').trim() || undefined,
    region: (process.env.IMAGE_SIGN_AWS_REGION || '').trim() || 'us-east-1',
    service: (process.env.IMAGE_SIGN_AWS_SERVICE || '').trim() || 's3',
  })
}

function passReqHeaders1(req: Request): Headers {
  const out1 = new Headers()
  for (const key1 of ['accept', 'accept-encoding', 'if-none-match', 'if-modified-since', 'range']) {
    const val1 = req.headers.get(key1)
    if (val1) out1.set(key1, val1)
  }
  return out1
}

function passResHeaders1(up1: Response, awsOn1: boolean): Headers {
  const out1 = new Headers()
  for (const key1 of passHeaders1) {
    const val1 = up1.headers.get(key1)
    if (val1) out1.set(key1, val1)
  }
  if (!out1.has('cache-control')) out1.set('cache-control', awsOn1 ? 'private, max-age=300' : 'public, max-age=3600')
  out1.set('x-img-sign-mode', awsOn1 ? 'aws4' : 'pass')
  out1.set('x-robots-tag', 'noindex')
  return out1
}

function uniq1(rows1: string[]): string[] {
  return [...new Set(rows1.map((it) => host1(it)).filter(Boolean))]
}

export default async function handler(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url)
  const raw1 = reqUrl.searchParams.get('u')?.trim() || ''
  if (!raw1) return new Response('missing image url', { status: 400 })

  let target1: URL
  try {
    target1 = makeTarget1(raw1, req, reqUrl)
  } catch (e) {
    const msg1 = e instanceof Error ? e.message : 'bad image url'
    return new Response(msg1, { status: 400 })
  }

  const allowHosts1 = uniq1([
    ...splitCsv1(process.env.IMAGE_SIGN_ALLOW_HOSTS),
    ...splitCsv1(process.env.VITE_DATA_HOST),
    ...splitCsv1(process.env.VITE_AQUA_HOST),
  ])
  if (!canVisit1(target1, req, allowHosts1)) {
    return new Response(`blocked host: ${target1.host}`, { status: 403 })
  }

  const awsHosts1 = splitCsv1(process.env.IMAGE_SIGN_AWS_HOSTS)
  const awsOn1 = wantAws1(target1, awsHosts1)
  const reqHeaders1 = passReqHeaders1(req)

  try {
    let up1: Response
    if (awsOn1) {
      const cli1 = awsCli1()
      if (!cli1) return new Response('missing aws sign env', { status: 500 })
      up1 = await cli1.fetch(target1.toString(), {
        method: 'GET',
        headers: reqHeaders1,
      })
    } else {
      up1 = await fetch(target1.toString(), {
        method: 'GET',
        headers: reqHeaders1,
      })
    }
    return new Response(up1.body, {
      status: up1.status,
      headers: passResHeaders1(up1, awsOn1),
    })
  } catch (e) {
    const msg1 = e instanceof Error ? e.message : 'image fetch failed'
    return new Response(msg1, { status: 502 })
  }
}
