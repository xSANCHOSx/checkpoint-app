/**
 * excelParser.ts — єдиний парсер Excel/Google Sheets для всього додатку.
 *
 * Три режими:
 *  1. parseExcel()        — автовизначення колонок по заголовках (для /api/import/route.ts)
 *  2. parseTemplateMode() — фіксовані клітинки + рядки по колонці  (для /admin/import)
 *  3. parseCustomMode()   — повністю довільна структура             (для /admin/import)
 *
 * Допоміжні:
 *  - getSheetNames()      — список листів файлу
 */

import * as XLSX from 'xlsx'
import { extractDigits, normalizePlate } from './plateUtils'

// ─── Типи — стандартний режим ─────────────────────────────────────────────────

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

// ─── Типи — custom/template режими ───────────────────────────────────────────

export interface TemplateConfig {
  mode: 'template'
  projectCell: string           // напр. «B2» — клітинка з назвою проекту (fallback)
  dateCell: string              // напр. «D3» — клітинка з датою (fallback)
  vehicleCol: string            // напр. «A»  — колонка з номерами авто
  startRow: number              // напр. 5   — перший рядок з авто (1-indexed)
  companyCol?: string
  projectColPerRow?: string
  accessTypeCol?: string
  expiresAtColPerRow?: string
  contactNameCol?: string
  contactPhoneCol?: string
  noteCol?: string
}

export interface CustomConfig {
  mode: 'custom'
  plateCol: string
  projectCol?: string
  projectFixed?: string
  companyCol?: string
  accessTypeCol?: string
  dateToCol?: string
  contactNameCol?: string
  contactPhoneCol?: string
  noteCol?: string
  dataStartRow: number          // 1-indexed
}

export type ParseConfig = TemplateConfig | CustomConfig

export interface ParsedVehicle {
  plate: string
  digits: string
  company: string
  project: string | null
  contactName: string | null
  contactPhone: string | null
  accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE'
  expiresAt: string | null
  note: string | null
}

export interface ParsedSheet {
  sheetName: string
  project: string
  expiresAt: string | null
  vehicles: ParsedVehicle[]
  errors: string[]
  selected: boolean
}

// ─── Допоміжні функції ────────────────────────────────────────────────────────

/** Заголовки колонок для автовизначення (стандартний режим) */
const COLUMN_MAP = {
  plate:        ['Номер авто', 'Номер', 'Держ. номер', 'Держномер', 'plate'],
  company:      ['Компанія', 'Організація', 'Проект', 'Фірма', 'company'],
  contactName:  ['Контакт', 'ПІБ', 'Відповідальний', 'contactName'],
  contactPhone: ['Телефон', 'Phone', 'contactPhone'],
  expiresAt:    ['Дійсний до', 'Закінчення', 'Термін', 'expiresAt', 'Термін дії'],
  note:         ['Примітка', 'Коментар', 'Note', 'Нотатка'],
}

/** Шукає значення колонки по списку можливих заголовків */
function getColumnByHeader(row: Record<string, unknown>, aliases: string[]): string | null {
  for (const alias of aliases) {
    const val = row[alias]
    if (val !== undefined && val !== null && val !== '') return String(val).trim()
  }
  return null
}

/** Перетворює літеру(и) колонки в числовий індекс (A=0, B=1, AA=26…) */
function colLetterToIndex(col: string): number {
  const c = col.toUpperCase().trim()
  let index = 0
  for (let i = 0; i < c.length; i++) {
    index = index * 26 + (c.charCodeAt(i) - 64)
  }
  return index - 1
}

/** Розбирає адресу клітинки «B2» → {col: 1, row: 1} */
function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.toUpperCase().trim().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  return { col: colLetterToIndex(match[1]), row: parseInt(match[2]) - 1 }
}

/** Читає значення клітинки з WorkSheet за числовими індексами */
function getCellValue(ws: XLSX.WorkSheet, col: number, row: number): string | null {
  const addr = XLSX.utils.encode_cell({ c: col, r: row })
  const cell = ws[addr]
  if (!cell) return null
  const val = XLSX.utils.format_cell(cell)
  return val && val.trim() ? val.trim() : null
}

/** Парсить дату з рядка або серійного числа Excel → ISO-рядок або null */
function parseDate(value: string | null): string | null {
  if (!value) return null
  const serial = parseFloat(value)
  if (!isNaN(serial) && serial > 40000) {
    const date = XLSX.SSF.parse_date_code(serial)
    if (date) return new Date(date.y, date.m - 1, date.d).toISOString()
  }
  const d = new Date(value)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

/** Розпізнає тип доступу з довільного тексту */
function parseAccessType(raw: string | null): 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE' | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (s === 'постійний' || s === 'постійна' || s === 'permanent')   return 'PERMANENT'
  if (s === 'тимчасовий' || s === 'тимчасова' || s === 'temporary') return 'TEMPORARY'
  if (s === 'разовий' || s === 'разова' || s === 'single_use' || s === 'single use') return 'SINGLE_USE'
  return null
}

// ─── Режим 1: СТАНДАРТНИЙ (автовизначення по заголовках) ─────────────────────
//  Використовується в: /api/import/route.ts

export function parseExcel(buffer: Buffer): {
  rows: ExcelVehicleRow[]
  errors: string[]
} {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(ws, {
    raw: false,
    defval: '',
  }) as Record<string, unknown>[]

  const rows: ExcelVehicleRow[] = []
  const errors: string[] = []

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2 // +2: рядок 1 — заголовок

    const plateRaw = getColumnByHeader(raw, COLUMN_MAP.plate)
    if (!plateRaw) {
      errors.push(`Рядок ${rowNum}: відсутній номер авто — пропущено`)
      return
    }

    const plate = normalizePlate(plateRaw)
    if (plate.length < 4) {
      errors.push(`Рядок ${rowNum}: некоректний номер "${plateRaw}" — пропущено`)
      return
    }

    const expiresRaw = getColumnByHeader(raw, COLUMN_MAP.expiresAt)
    let expiresAt: Date | null = null

    if (expiresRaw) {
      const parsed = new Date(expiresRaw)
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed
      } else {
        errors.push(`Рядок ${rowNum}: некоректна дата "${expiresRaw}" — встановлено постійний пропуск`)
      }
    }

    rows.push({
      plate,
      digits: extractDigits(plate),
      company: getColumnByHeader(raw, COLUMN_MAP.company) || '',
      contactName: getColumnByHeader(raw, COLUMN_MAP.contactName),
      contactPhone: getColumnByHeader(raw, COLUMN_MAP.contactPhone),
      accessType: expiresAt ? 'TEMPORARY' : 'PERMANENT',
      expiresAt,
      note: getColumnByHeader(raw, COLUMN_MAP.note),
    })
  })

  return { rows, errors }
}

// ─── Режим 2: ШАБЛОН (фіксовані клітинки + рядки по колонці) ────────────────
//  Використовується в: /admin/import/page.tsx

export function parseTemplateMode(
  buffer: Buffer,
  config: TemplateConfig,
  sheetNames?: string[]
): ParsedSheet[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const targetSheets = sheetNames
    ? wb.SheetNames.filter(n => sheetNames.includes(n))
    : wb.SheetNames

  const results: ParsedSheet[] = []

  for (const sheetName of targetSheets) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue

    const errors: string[] = []

    const projRef = parseCellRef(config.projectCell)
    const projectFallback = projRef
      ? (getCellValue(ws, projRef.col, projRef.row) ?? sheetName)
      : sheetName

    const dateRef = parseCellRef(config.dateCell)
    const expiresAtFixed = parseDate(dateRef ? getCellValue(ws, dateRef.col, dateRef.row) : null)

    const colIdx             = colLetterToIndex(config.vehicleCol)
    const companyColIdx      = config.companyCol         ? colLetterToIndex(config.companyCol)         : -1
    const projectColIdx      = config.projectColPerRow   ? colLetterToIndex(config.projectColPerRow)   : -1
    const accessTypeColIdx   = config.accessTypeCol      ? colLetterToIndex(config.accessTypeCol)      : -1
    const expiresAtColIdx    = config.expiresAtColPerRow ? colLetterToIndex(config.expiresAtColPerRow) : -1
    const contactNameColIdx  = config.contactNameCol     ? colLetterToIndex(config.contactNameCol)     : -1
    const contactPhoneColIdx = config.contactPhoneCol    ? colLetterToIndex(config.contactPhoneCol)    : -1
    const noteColIdx         = config.noteCol            ? colLetterToIndex(config.noteCol)            : -1

    const startRowIdx = config.startRow - 1
    const vehicles: ParsedVehicle[] = []
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

    for (let r = startRowIdx; r <= range.e.r; r++) {
      const raw = getCellValue(ws, colIdx, r)
      if (!raw) continue

      const plate = normalizePlate(raw)
      if (plate.length < 4) {
        errors.push(`Рядок ${r + 1}: некоректний номер "${raw}"`)
        continue
      }

      const company     = companyColIdx  >= 0 ? getCellValue(ws, companyColIdx, r)  : null
      const projectName = projectColIdx  >= 0 ? getCellValue(ws, projectColIdx, r)  : null

      const rawAccessType    = accessTypeColIdx >= 0 ? getCellValue(ws, accessTypeColIdx, r) : null
      const parsedAccessType = parseAccessType(rawAccessType)

      let expiresAt: string | null = expiresAtFixed
      if (expiresAtColIdx >= 0) expiresAt = parseDate(getCellValue(ws, expiresAtColIdx, r))

      const accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE' =
        parsedAccessType ?? (expiresAt ? 'TEMPORARY' : 'PERMANENT')

      vehicles.push({
        plate,
        digits: extractDigits(plate),
        company: company ?? '',
        project: projectName,
        contactName:  contactNameColIdx  >= 0 ? getCellValue(ws, contactNameColIdx, r)  : null,
        contactPhone: contactPhoneColIdx >= 0 ? getCellValue(ws, contactPhoneColIdx, r) : null,
        accessType,
        expiresAt: expiresAt ?? null,
        note: noteColIdx >= 0 ? getCellValue(ws, noteColIdx, r) : null,
      })
    }

    results.push({
      sheetName,
      project: projectFallback,
      expiresAt: expiresAtFixed,
      vehicles,
      errors,
      selected: true,
    })
  }

  return results
}

// ─── Режим 3: ДОВІЛЬНИЙ (повністю задається користувачем) ────────────────────
//  Використовується в: /admin/import/page.tsx

export function parseCustomMode(
  buffer: Buffer,
  config: CustomConfig
): ParsedSheet[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const results: ParsedSheet[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue

    const errors: string[] = []
    const vehicles: ParsedVehicle[] = []
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

    const plateColIdx        = colLetterToIndex(config.plateCol)
    const projectColIdx      = config.projectCol      ? colLetterToIndex(config.projectCol)      : -1
    const companyColIdx      = config.companyCol      ? colLetterToIndex(config.companyCol)      : -1
    const accessTypeColIdx   = config.accessTypeCol   ? colLetterToIndex(config.accessTypeCol)   : -1
    const dateToColIdx       = config.dateToCol       ? colLetterToIndex(config.dateToCol)       : -1
    const contactNameColIdx  = config.contactNameCol  ? colLetterToIndex(config.contactNameCol)  : -1
    const contactPhoneColIdx = config.contactPhoneCol ? colLetterToIndex(config.contactPhoneCol) : -1
    const noteColIdx         = config.noteCol         ? colLetterToIndex(config.noteCol)         : -1

    const startRowIdx = config.dataStartRow - 1

    for (let r = startRowIdx; r <= range.e.r; r++) {
      const rawPlate = getCellValue(ws, plateColIdx, r)
      if (!rawPlate) continue

      const plate = normalizePlate(rawPlate)
      if (plate.length < 4) {
        errors.push(`Рядок ${r + 1}: некоректний номер "${rawPlate}"`)
        continue
      }

      const projectName = projectColIdx >= 0
        ? getCellValue(ws, projectColIdx, r)
        : (config.projectFixed ?? null)

      const company = companyColIdx >= 0
        ? (getCellValue(ws, companyColIdx, r) ?? '')
        : ''

      const rawDate   = dateToColIdx >= 0 ? getCellValue(ws, dateToColIdx, r) : null
      const expiresAt = parseDate(rawDate)

      const rawAccessType    = accessTypeColIdx >= 0 ? getCellValue(ws, accessTypeColIdx, r) : null
      const parsedAccessType = parseAccessType(rawAccessType)
      const accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE' =
        parsedAccessType ?? (expiresAt ? 'TEMPORARY' : 'PERMANENT')

      vehicles.push({
        plate,
        digits: extractDigits(plate),
        company,
        project: projectName,
        contactName:  contactNameColIdx  >= 0 ? getCellValue(ws, contactNameColIdx, r)  : null,
        contactPhone: contactPhoneColIdx >= 0 ? getCellValue(ws, contactPhoneColIdx, r) : null,
        accessType,
        expiresAt,
        note: noteColIdx >= 0 ? getCellValue(ws, noteColIdx, r) : null,
      })
    }

    if (vehicles.length === 0 && errors.length === 0) continue

    results.push({
      sheetName,
      project: config.projectFixed ?? sheetName,
      expiresAt: null,
      vehicles,
      errors,
      selected: true,
    })
  }

  return results
}

// ─── Допоміжна: список листів файлу ──────────────────────────────────────────

export function getSheetNames(buffer: Buffer): string[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  return wb.SheetNames
}