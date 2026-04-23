import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/admin', '/api/vehicles', '/api/import', '/api/logs']

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(p => pathname.startsWith(p))
}

export function middleware(req: NextRequest) {
  // Пошук /api/search доступний без авторизації (для оператора)
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

      if (
        user === process.env.ADMIN_USER &&
        pass === process.env.ADMIN_PASS
      ) {
        return NextResponse.next()
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="КПП Admin", charset="UTF-8"',
    },
  })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/vehicles/:path*',
    '/api/import',
    '/api/logs/:path*',
  ],
}
