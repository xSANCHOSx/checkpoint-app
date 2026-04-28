import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
const TOKEN_COOKIE = 'kpp_token'
const CONFIG_COOKIE = 'kpp_config'

// Завжди захищені — адмін-панель та управлінські API
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

// Умовно захищені — відкриті під час тестування (operatorAuthRequired=false),
// вимагають JWT коли в адмінці увімкнена авторизація операторів.
// Сюди входять sync-ендпоінти, checkpoint, batch-логи і пошук.
const OPERATOR_GUARDED_PATHS = [
  '/api/vehicles/sync',
  '/api/emergency/sync',
  '/api/logs/batch',
  '/api/checkpoint',
  '/api/search',
]

// Завжди публічні — логін та офлайн-сторінка
const ALWAYS_PUBLIC_PATHS = [
  '/api/auth/login',
  '/admin/login',
]

const ADMIN_ONLY_PATHS = [
  '/api/auth/users',
  '/api/import',
  '/api/settings',
]

function isAlwaysPublic(pathname: string): boolean {
  return ALWAYS_PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function isOperatorGuarded(pathname: string): boolean {
  return OPERATOR_GUARDED_PATHS.some(p => pathname.startsWith(p))
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

// Читає прапор operatorAuthRequired з підписаного JWT-cookie kpp_config
async function getOperatorAuthRequired(req: NextRequest): Promise<boolean> {
  const configCookie = req.cookies.get(CONFIG_COOKIE)?.value
  if (!configCookie) return false
  try {
    const { payload } = await jwtVerify(configCookie, SECRET)
    return payload.operatorAuthRequired === true
  } catch {
    return false
  }
}

// Перевіряє JWT-токен з cookie або Authorization header.
// Повертає payload або null.
async function verifyJwt(req: NextRequest) {
  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value
  const authHeader = req.headers.get('authorization') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = cookieToken || bearerToken
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Завжди публічні — без перевірок
  if (isAlwaysPublic(pathname)) return NextResponse.next()

  // 2. Умовно захищені (sync / checkpoint / batch / search)
  //    Якщо operatorAuthRequired=false → пропускаємо без авторизації (режим тестування)
  //    Якщо operatorAuthRequired=true  → вимагаємо валідний JWT
  if (isOperatorGuarded(pathname)) {
    const authRequired = await getOperatorAuthRequired(req)
    if (!authRequired) return NextResponse.next()

    const payload = await verifyJwt(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = NextResponse.next()
    res.headers.set('x-user-id', String(payload.sub))
    res.headers.set('x-user-role', String(payload.role ?? ''))
    res.headers.set('x-username', String(payload.username ?? ''))
    return res
  }

  // 3. Сторінка оператора /
  if (pathname === '/') {
    const authRequired = await getOperatorAuthRequired(req)
    if (!authRequired) return NextResponse.next()

    const payload = await verifyJwt(req)
    if (!payload) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', '/')
      return NextResponse.redirect(loginUrl)
    }

    const res = NextResponse.next()
    res.headers.set('x-user-id', String(payload.sub))
    res.headers.set('x-user-role', String(payload.role ?? ''))
    res.headers.set('x-username', String(payload.username ?? ''))
    return res
  }

  // 4. Адмін-панель та управлінські API — завжди захищені
  const isAdminPage = isProtectedAdmin(pathname)
  const isApiRoute = isProtectedApi(pathname)
  if (!isAdminPage && !isApiRoute) return NextResponse.next()

  const payload = await verifyJwt(req)

  if (!payload) {
    if (isAdminPage) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    // Завжди захищені
    '/api/vehicles/:path*',   // включає /api/vehicles/sync
    '/api/import/:path*',
    '/api/emergency/:path*',  // включає /api/emergency/sync
    '/api/projects/:path*',
    '/api/logs/:path*',       // включає /api/logs/batch
    '/api/auth/users/:path*',
    '/api/auth/me',
    '/api/settings/:path*',
    // Умовно захищені — не були в матчері раніше
    '/api/search',
    '/api/checkpoint',
  ],
}