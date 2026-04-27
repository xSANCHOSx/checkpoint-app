import { NextRequest, NextResponse } from 'next/server'

// Middleware вже верифікував токен і передав дані через заголовки
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const role = request.headers.get('x-user-role')
  const username = request.headers.get('x-username')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ id: Number(userId), username, role })
}
