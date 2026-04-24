import * as XLSX from 'xlsx'
import { normalizePlate, extractDigits } from './plateUtils'

// ─── Типи ─────────────────────────────────────────────────────────────────────

export interface TemplateConfig {
  mode: 'template'
  projectCell: string  // напр. "B2" — клітинка з назвою проекту
  dateCell: string     // напр. "D3" — клітинка з датою закінчення
  vehicleCol: string   // напр. "A"  — колонка з номерами авто
  startRow: number     // напр. 5   — перший рядок з авто (1-indexed)
}

export interface CustomConfig {
  mode: 'custom'
  plateCol: string        // напр. "A" — колонка з номерами
  projectCol?: string     // напр. "B" — колонка з назвою проекту
  projectFixed?: string   // фіксована назва проекту (якщо projectCol не задано)
  dateToCol?: string      // напр. "C" — колонка "дійсний до"
  dataStartRow: number    // напр. 2 (1-indexed, рядок з якого читати дані)
}

export type ParseConfig = TemplateConfig | CustomConfig

export interface ParsedVehicle {
  plate: string
  digits: string
  company: string
  expiresAt: string | null
  accessType: 'PERMANENT' | 'TEMPORARY'
}

export interface ParsedSheet {
  sheetName: string
  project: string
  expiresAt: string | null
  vehicles: ParsedVehicle[]
  errors: string[]
  selected: boolean
}

// ─── Допоміжні функції ─────────────────────────────────────────────────────────

// "A" → 0, "B" → 1, "AA" → 26
function colLetterToIndex(col: string): number {
  const c = col.toUpperCase().trim()
  let index = 0
  for (let i = 0; i < c.length; i++) {
    index = index * 26 + (c.charCodeAt(i) - 64)
  }
  return index - 1
}

// "B2" → { col: 1, row: 1 } (0-indexed)
function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.toUpperCase().trim().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  return {
    col: colLetterToIndex(match[1]),
    row: parseInt(match[2]) - 1,
  }
}

// Отримати значення клітинки за 0-indexed col/row
function getCellValue(ws: XLSX.WorkSheet, col: number, row: number): string | null {
  const addr = XLSX.utils.encode_cell({ c: col, r: row })
  const cell = ws[addr]
  if (!cell) return null
  const val = XLSX.utils.format_cell(cell)
  return val && val.trim() ? val.trim() : null
}

// Парсинг дати — Excel може зберігати дату як число або рядок
function parseDate(value: string | null): string | null {
  if (!value) return null
  // Excel serial number
  const serial = parseFloat(value)
  if (!isNaN(serial) && serial > 40000) {
    const date = XLSX.SSF.parse_date_code(serial)
    if (date) {
      return new Date(date.y, date.m - 1, date.d).toISOString()
    }
  }
  // Спроба розпарсити рядок
  const d = new Date(value)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

// ─── Режим ШАБЛОН (листи = проекти) ───────────────────────────────────────────

export function parseTemplateMode(
  buffer: Buffer,
  config: TemplateConfig,
  sheetNames?: string[] // якщо undefined — всі листи
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

    // Назва проекту
    const projRef = parseCellRef(config.projectCell)
    const project = projRef
      ? (getCellValue(ws, projRef.col, projRef.row) ?? sheetName)
      : sheetName

    // Дата закінчення
    const dateRef = parseCellRef(config.dateCell)
    const rawDate = dateRef ? getCellValue(ws, dateRef.col, dateRef.row) : null
    const expiresAt = parseDate(rawDate)

    // Авто — читаємо зверху донизу в колонці vehicleCol
    const colIdx = colLetterToIndex(config.vehicleCol)
    const startRowIdx = config.startRow - 1 // 0-indexed
    const vehicles: ParsedVehicle[] = []

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

    for (let r = startRowIdx; r <= range.e.r; r++) {
      const raw = getCellValue(ws, colIdx, r)
      if (!raw) continue // порожня клітинка — пропускаємо

      const plate = normalizePlate(raw)
      if (plate.length < 4) {
        errors.push(`Рядок ${r + 1}: некоректний номер "${raw}"`)
        continue
      }

      vehicles.push({
        plate,
        digits: extractDigits(plate),
        company: project,
        expiresAt: expiresAt ?? null,
        accessType: expiresAt ? 'TEMPORARY' : 'PERMANENT',
      })
    }

    results.push({ sheetName, project, expiresAt, vehicles, errors, selected: true })
  }

  return results
}

// ─── Режим ДОВІЛЬНИЙ (кастомні колонки) ────────────────────────────────────────

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
    const plateColIdx = colLetterToIndex(config.plateCol)
    const projectColIdx = config.projectCol ? colLetterToIndex(config.projectCol) : -1
    const dateToColIdx = config.dateToCol ? colLetterToIndex(config.dateToCol) : -1
    const startRowIdx = config.dataStartRow - 1

    for (let r = startRowIdx; r <= range.e.r; r++) {
      const rawPlate = getCellValue(ws, plateColIdx, r)
      if (!rawPlate) continue

      const plate = normalizePlate(rawPlate)
      if (plate.length < 4) {
        errors.push(`Рядок ${r + 1}: некоректний номер "${rawPlate}"`)
        continue
      }

      const company =
        projectColIdx >= 0
          ? (getCellValue(ws, projectColIdx, r) ?? config.projectFixed ?? 'Невідомо')
          : (config.projectFixed ?? 'Невідомо')

      const rawDate = dateToColIdx >= 0 ? getCellValue(ws, dateToColIdx, r) : null
      const expiresAt = parseDate(rawDate)

      vehicles.push({
        plate,
        digits: extractDigits(plate),
        company,
        expiresAt,
        accessType: expiresAt ? 'TEMPORARY' : 'PERMANENT',
      })
    }

    // Пропускаємо порожні листи
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

// ─── Отримати список листів з файлу ────────────────────────────────────────────

export function getSheetNames(buffer: Buffer): string[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  return wb.SheetNames
}
