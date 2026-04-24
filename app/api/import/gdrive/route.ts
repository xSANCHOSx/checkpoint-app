import { NextRequest, NextResponse } from 'next/server'

// Витягує FILE_ID з різних форматів Google посилань
function extractGoogleId(url: string): string | null {
  // Google Sheets: /spreadsheets/d/FILE_ID/
  const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheetsMatch) return sheetsMatch[1]
  // Google Drive file: /file/d/FILE_ID/ або ?id=FILE_ID
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (driveMatch) return driveMatch[1]
  return null
}

function buildDownloadUrl(url: string, fileId: string): string {
  // Google Sheets → export як xlsx
  if (url.includes('spreadsheets')) {
    return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`
  }
  // Google Drive → прямий download
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL не вказано' }, { status: 400 })
  }

  const fileId = extractGoogleId(url)
  if (!fileId) {
    return NextResponse.json({ error: 'Не вдалося знайти ID файлу в посиланні' }, { status: 400 })
  }

  const downloadUrl = buildDownloadUrl(url, fileId)

  const res = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow',
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: `Не вдалося завантажити файл (${res.status}). Перевірте що файл відкритий для перегляду.` },
      { status: 502 }
    )
  }

  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
}
