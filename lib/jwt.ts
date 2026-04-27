import { SignJWT, jwtVerify } from 'jose'

const SECRET_RAW = process.env.JWT_SECRET
if (!SECRET_RAW) throw new Error('JWT_SECRET is not set')
const SECRET = new TextEncoder().encode(SECRET_RAW)

export const TOKEN_COOKIE = 'kpp_token'
export const TOKEN_EXPIRY = '24h'
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

export interface JWTPayload {
  sub: string      // user id as string
  username: string
  role: 'ADMIN' | 'OPERATOR'
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export function tokenCookieOptions(value: string, clear = false) {
  return {
    name: TOKEN_COOKIE,
    value: clear ? '' : value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: clear ? 0 : TOKEN_EXPIRY_MS / 1000,
  }
}
