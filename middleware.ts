import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
const TOKEN_COOKIE = 'kpp_token'

// Маршрути що захищені JWT
const PROTECTED_ADMIN_PATHS = ['/admin']
const PROTECTED_API_PATHS = [
  '/api/vehicles',
  '/api/import',
  '/api/emergency',
  '/api/projects',
  '/api/logs',
  '/api/auth/users',  // тільки для ADMIN
]

// Публічні — без токену
const PUBLIC_PATHS = [
  '/api/vehicles/sync',
  '/api/emergency/sync',
  '/api/logs/batch',
  '/api/checkpoint',
  '/api/auth/login',   // логін
  '/admin/login',      // сторінка логіну
]

// Тільки ADMIN може звертатись до цих шляхів
const ADMIN_ONLY_PATHS = [
  '/api/auth/users',
  '/api/import',
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Публічні маршрути — пропускаємо
  if (isPublic(pathname)) return NextResponse.next()

  const isAdminPage = isProtectedAdmin(pathname)
  const isApiRoute = isProtectedApi(pathname)

  if (!isAdminPage && !isApiRoute) return NextResponse.next()

  // Читаємо токен з cookie (адмін) або Authorization Bearer (API)
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

  // Верифікуємо JWT
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const role = payload.role as string

    // ADMIN_ONLY маршрути — тільки для адміна
    if (isAdminOnly(pathname) && role !== 'ADMIN') {
      if (isAdminPage) return NextResponse.redirect(new URL('/admin', req.url))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Передаємо userId і role через заголовки в route handlers
    const response = NextResponse.next()
    response.headers.set('x-user-id', String(payload.sub))
    response.headers.set('x-user-role', role)
    response.headers.set('x-username', String(payload.username))
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch {
    // Токен недійсний або прострочений
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
    '/admin/:path*',
    '/api/vehicles/:path*',
    '/api/import/:path*',
    '/api/emergency/:path*',
    '/api/projects/:path*',
    '/api/logs/:path*',
    '/api/auth/users/:path*',
  ],
}
