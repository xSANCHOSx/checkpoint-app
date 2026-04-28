import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
const TOKEN_COOKIE = 'kpp_token'
const CONFIG_COOKIE = 'kpp_config'

// Маршрути що захищені JWT
const PROTECTED_ADMIN_PATHS = ['/admin']
const PROTECTED_API_PATHS = [
  '/api/vehicles',
  '/api/import',
  '/api/emergency',
  '/api/projects',
  '/api/logs',
  '/api/auth/users',
  '/api/auth/me',
  '/api/settings',
]

const PUBLIC_PATHS = [
  '/api/vehicles/sync',
  '/api/emergency/sync',
  '/api/logs/batch',
  '/api/checkpoint',
  '/api/auth/login',
  '/admin/login',
]

const ADMIN_ONLY_PATHS = [
  '/api/auth/users',
  '/api/import',
  '/api/settings',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function isProtectedAdmin(pathname: string): boolean {
  return PROTECTED_ADMIN_PATHS.some(p => pathname.startsWith(p)) &&
    !pathname.startsWith('/admin/login')
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PATHS.some(p => pathname.startsWith(p))
}

function isAdminOnly(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p))
}

/**
 * Перевіряє чи потрібна авторизація для сторінки оператора (/).
 *
 * Пріоритет:
 * 1. ENV змінна AUTH_OPERATOR_REQUIRED=true/false — найвищий пріоритет, вимагає рестарту
 * 2. Cookie kpp_config — встановлюється з адмін-панелі, без рестарту
 * 3. За замовчуванням: false (режим тестування)
 */
async function isOperatorAuthRequired(req: NextRequest): Promise<boolean> {
  // 1. ENV override
  const envVal = process.env.AUTH_OPERATOR_REQUIRED
  if (envVal === 'true') return true
  if (envVal === 'false') return false

  // 2. Config cookie (встановлюється адміном)
  const configCookie = req.cookies.get(CONFIG_COOKIE)?.value
  if (configCookie) {
    try {
      const { payload } = await jwtVerify(configCookie, SECRET)
      return payload.operatorAuthRequired === true
    } catch {
      // cookie недійсний — ігноруємо
    }
  }

  // 3. Default: відкритий доступ (тестування)
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  // ── Сторінка оператора / ──────────────────────────────────────────
  if (pathname === '/') {
    const authRequired = await isOperatorAuthRequired(req)
    if (!authRequired) return NextResponse.next()

    const token = req.cookies.get(TOKEN_COOKIE)?.value
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', '/')
      return NextResponse.redirect(loginUrl)
    }

    try {
      const { payload } = await jwtVerify(token, SECRET)
      const res = NextResponse.next()
      res.headers.set('x-user-id', String(payload.sub))
      res.headers.set('x-user-role', payload.role as string)
      res.headers.set('x-username', String(payload.username ?? ''))
      return res
    } catch {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', '/')
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete(TOKEN_COOKIE)
      return res
    }
  }

  // ── Адмін-панель та API ───────────────────────────────────────────
  const isAdminPage = isProtectedAdmin(pathname)
  const isApiRoute = isProtectedApi(pathname)

  if (!isAdminPage && !isApiRoute) return NextResponse.next()

  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value
  const authHeader = req.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = cookieToken || bearerToken

  if (!token) {
    if (isAdminPage) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { payload } = await jwtVerify(token, SECRET)
    const role = payload.role as string

    if (isAdminOnly(pathname) && role !== 'ADMIN') {
      if (isAdminPage) return NextResponse.redirect(new URL('/admin', req.url))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const response = NextResponse.next()
    response.headers.set('x-user-id', String(payload.sub))
    response.headers.set('x-user-role', role)
    response.headers.set('x-username', String(payload.username ?? ''))
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch {
    if (isAdminPage) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('expired', '1')
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete(TOKEN_COOKIE)
      return res
    }
    const res = NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 })
    res.cookies.delete(TOKEN_COOKIE)
    return res
  }
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/api/vehicles/:path*',
    '/api/import/:path*',
    '/api/emergency/:path*',
    '/api/projects/:path*',
    '/api/logs/:path*',
    '/api/auth/users/:path*',
    '/api/auth/me',
    '/api/settings/:path*',
  ],
}