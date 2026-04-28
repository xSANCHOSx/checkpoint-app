import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { settingsPatchSchema, formatZodError } from '@/lib/zodSchemas'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
const CONFIG_COOKIE = 'kpp_config'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export async function GET(req: NextRequest) {
  const configCookie = req.cookies.get(CONFIG_COOKIE)?.value
  let operatorAuthRequired = false

  if (configCookie) {
    try {
      const { payload } = await jwtVerify(configCookie, SECRET)
      operatorAuthRequired = payload.operatorAuthRequired === true
    } catch {}
  }

  return NextResponse.json({ operatorAuthRequired })
}

export async function PATCH(req: NextRequest) {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Zod-валідація
  const parsed = settingsPatchSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    )
  }

  const { operatorAuthRequired } = parsed.data

  const configToken = await new SignJWT({ operatorAuthRequired })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(SECRET)

  const res = NextResponse.json({ ok: true, operatorAuthRequired })
  res.cookies.set(CONFIG_COOKIE, configToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    // Виправлено: додано secure прапорець для production
    secure: IS_PRODUCTION,
  })
  return res
}