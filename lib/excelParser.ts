import * as XLSX from 'xlsx'
import { normalizePlate, extractDigits } from './plateUtils'

export interface ExcelVehicleRow {
  plate: string
  digits: string
  company: string
  contactName: string | null
  contactPhone: string | null
  accessType: 'PERMANENT' | 'TEMPORARY'
  expiresAt: Date | null
  note: string | null
}

// Конфігурація колонок — підтримує різні назви заголовків
const COLUMN_MAP = {
  plate:        ['Номер авто', 'Номер', 'Держ. номер', 'Держномер', 'plate'],
  company:      ['Компанія', 'Організація', 'Проект', 'Фірма', 'company'],
  contactName:  ['Контакт', 'ПІБ', 'Відповідальний', 'contactName'],
  contactPhone: ['Телефон', 'Phone', 'contactPhone'],
  expiresAt:    ['Дійсний до', 'Закінчення', 'Термін', 'expiresAt', 'Термін дії'],
  note:         ['Примітка', 'Коментар', 'Note', 'Нотатка'],
}

function getColumn(row: Record<string, unknown>, aliases: string[]): string | null {
  for (const alias of aliases) {
    const val = row[alias]
    if (val !== undefined && val !== null && val !== '') {
      return String(val).trim()
    }
  }
  return null
}

export function parseExcel(buffer: Buffer): {
  rows: ExcelVehicleRow[]
  errors: string[]
} {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' }) as Record<string, unknown>[]

  const rows: ExcelVehicleRow[] = []
  const errors: string[] = []

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2 // +2 бо перший рядок — заголовок

    const plateRaw = getColumn(raw, COLUMN_MAP.plate)
    if (!plateRaw) {
      errors.push(`Рядок ${rowNum}: відсутній номер авто — пропущено`)
      return
    }

    const plate = normalizePlate(plateRaw)
    if (plate.length < 4) {
      errors.push(`Рядок ${rowNum}: некоректний номер "${plateRaw}" — пропущено`)
      return
    }

    const expiresRaw = getColumn(raw, COLUMN_MAP.expiresAt)
    let expiresAt: Date | null = null

    if (expiresRaw) {
      const parsed = new Date(expiresRaw)
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed
      } else {
        errors.push(
          `Рядок ${rowNum}: некоректна дата "${expiresRaw}" — встановлено постійний пропуск`
        )
      }
    }

    rows.push({
      plate,
      digits: extractDigits(plate),
      company: getColumn(raw, COLUMN_MAP.company) || 'Невідома',
      contactName: getColumn(raw, COLUMN_MAP.contactName),
      contactPhone: getColumn(raw, COLUMN_MAP.contactPhone),
      accessType: expiresAt ? 'TEMPORARY' : 'PERMANENT',
      expiresAt,
      note: getColumn(raw, COLUMN_MAP.note),
    })
  })

  return { rows, errors }
}
