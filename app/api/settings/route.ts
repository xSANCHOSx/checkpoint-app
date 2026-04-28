import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
const CONFIG_COOKIE = 'kpp_config'

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
  const body = await req.json()
  const operatorAuthRequired = Boolean(body.operatorAuthRequired)

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
  })
  return res
}