import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/admin', '/api/vehicles', '/api/import', '/api/emergency', '/api/projects']

// Публічні API для операторів (без авторизації):
// /api/vehicles/sync  — синхронізація авто
// /api/logs/batch     — офлайн-push логів
// /api/checkpoint     — запис проїзду оператором
//
// Захищено (Basic Auth):
// /admin/*            — адмін-панель
// /api/vehicles/*     — CRUD авто (крім /sync)
// /api/import         — імпорт Excel
// /api/logs (GET)     — перегляд логів адміном — захищаємо в самому route handler

const PUBLIC_EXCEPTIONS = ['/api/vehicles/sync', '/api/emergency/sync']

function isProtected(pathname: string): boolean {
  if (PUBLIC_EXCEPTIONS.some(p => pathname.startsWith(p))) return false
  return PROTECTED_PATHS.some(p => pathname.startsWith(p))
}

export function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const authHeader = req.headers.get('authorization') || ''
  const [scheme, b64] = authHeader.split(' ')

  if (scheme === 'Basic' && b64) {
    const decoded = Buffer.from(b64, 'base64').toString('utf-8')
    const colonIdx = decoded.indexOf(':')
    if (colonIdx !== -1) {
      const user = decoded.slice(0, colonIdx)
      const pass = decoded.slice(colonIdx + 1)

      // Константний час порівняння для захисту від timing attack
      const expectedUser = process.env.ADMIN_USER ?? ''
      const expectedPass = process.env.ADMIN_PASS ?? ''

      const userMatch = user.length === expectedUser.length &&
        Buffer.from(user).equals(Buffer.from(expectedUser))
      const passMatch = pass.length === expectedPass.length &&
        Buffer.from(pass).equals(Buffer.from(expectedPass))

      if (userMatch && passMatch) {
        const response = NextResponse.next()
        // Заборонити кешування захищених відповідей
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        return response
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="KPP Admin", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/vehicles/:path*',
    '/api/import/:path*',
    '/api/emergency/:path*',
    '/api/projects/:path*',
  ],
}
