export interface Env {
  GOOGLE_MAPS_KEY: string
  OPENSTATES_KEY: string
  // Optional: comma-separated list of allowed origins (e.g. "https://www.strongtownschicago.org").
  // Omit to allow all origins — useful during initial setup. Tighten before production.
  ALLOWED_ORIGIN?: string
}

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const OPENSTATES_URL = 'https://v3.openstates.org/people.geo'

// Always allow Vite dev and preview servers regardless of ALLOWED_ORIGIN.
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { pathname, searchParams } = new URL(request.url)

    let upstream: Response
    if (pathname === '/geocode') {
      upstream = await proxyGeocode(searchParams, env)
    } else if (pathname === '/openstates') {
      upstream = await proxyOpenstates(searchParams, env)
    } else {
      return new Response('Not found', { status: 404 })
    }

    // Merge upstream headers with CORS headers.
    const headers = new Headers(upstream.headers)
    for (const [k, v] of Object.entries(corsHeaders(request, env))) {
      headers.set(k, v)
    }
    return new Response(upstream.body, { status: upstream.status, headers })
  },
} satisfies ExportedHandler<Env>

// ─── Proxy helpers ────────────────────────────────────────────────────────────

async function proxyGeocode(params: URLSearchParams, env: Env): Promise<Response> {
  const url = new URL(GEOCODE_URL)
  for (const [k, v] of params) url.searchParams.append(k, v)
  url.searchParams.set('key', env.GOOGLE_MAPS_KEY)
  return fetch(url)
}

async function proxyOpenstates(params: URLSearchParams, env: Env): Promise<Response> {
  const url = new URL(OPENSTATES_URL)
  for (const [k, v] of params) {
    // Strip any client-supplied key — the Worker injects its own.
    if (k !== 'apikey') url.searchParams.append(k, v)
  }
  url.searchParams.set('apikey', env.OPENSTATES_KEY)
  return fetch(url)
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowedOrigin = resolveOrigin(origin, env)
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function resolveOrigin(origin: string, env: Env): string {
  // No restriction configured → allow all (permissive default for initial setup).
  if (!env.ALLOWED_ORIGIN) return origin

  const configured = env.ALLOWED_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  const allowed = [...DEV_ORIGINS, ...configured]
  return allowed.includes(origin) ? origin : ''
}
