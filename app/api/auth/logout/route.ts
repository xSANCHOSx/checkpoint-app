import { NextResponse } from 'next/server'
import { tokenCookieOptions } from '@/lib/jwt'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(tokenCookieOptions('', true))
  return response
}
