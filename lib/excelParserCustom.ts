import * as XLSX from 'xlsx'
import { extractDigits, normalizePlate } from './plateUtils'

// ─── Типи ─────────────────────────────────────────────────────────────────────

export interface TemplateConfig {
  mode: 'template'
  projectCell: string           // напр. "B2" — клітинка з назвою проекту (fallback)
  dateCell: string              // напр. "D3" — клітинка з датою (fallback)
  vehicleCol: string            // напр. "A"  — колонка з номерами авто
  startRow: number              // напр. 5   — перший рядок з авто (1-indexed)
  // Опціональні per-row колонки
  companyCol?: string           // напр. "B" — колонка компанії
  projectColPerRow?: string     // напр. "C" — колонка проекту per-row
  accessTypeCol?: string        // напр. "D" — колонка типу доступу
  expiresAtColPerRow?: string   // напр. "E" — колонка дати per-row
  contactNameCol?: string       // напр. "F"
  contactPhoneCol?: string      // напр. "G"
  noteCol?: string              // напр. "H"
}

export interface CustomConfig {
  mode: 'custom'
  plateCol: string              // напр. "A" — колонка з номерами
  projectCol?: string           // напр. "C" — колонка проекту
  projectFixed?: string         // фіксована назва проекту
  companyCol?: string           // напр. "B" — колонка компанії
  accessTypeCol?: string        // напр. "D" — колонка типу доступу
  dateToCol?: string            // напр. "E" — колонка "дійсний до"
  contactNameCol?: string       // напр. "F"
  contactPhoneCol?: string      // напр. "G"
  noteCol?: string              // напр. "H"
  dataStartRow: number          // напр. 2 (1-indexed)
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

// ─── Маппінг типу доступу ──────────────────────────────────────────────────────

function parseAccessType(raw: string | null): 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE' | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  if (s === 'постійний' || s === 'постійна' || s === 'permanent') return 'PERMANENT'
  if (s === 'тимчасовий' || s === 'тимчасова' || s === 'temporary') return 'TEMPORARY'
  if (s === 'разовий' || s === 'разова' || s === 'single_use' || s === 'single use') return 'SINGLE_USE'
  return null
}

// ─── Допоміжні функції ─────────────────────────────────────────────────────────

function colLetterToIndex(col: string): number {
  const c = col.toUpperCase().trim()
  let index = 0
  for (let i = 0; i < c.length; i++) {
    index = index * 26 + (c.charCodeAt(i) - 64)
  }
  return index - 1
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.toUpperCase().trim().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  return {
    col: colLetterToIndex(match[1]),
    row: parseInt(match[2]) - 1,
  }
}

function getCellValue(ws: XLSX.WorkSheet, col: number, row: number): string | null {
  const addr = XLSX.utils.encode_cell({ c: col, r: row })
  const cell = ws[addr]
  if (!cell) return null
  const val = XLSX.utils.format_cell(cell)
  return val && val.trim() ? val.trim() : null
}

function parseDate(value: string | null): string | null {
  if (!value) return null
  const serial = parseFloat(value)
  if (!isNaN(serial) && serial > 40000) {
    const date = XLSX.SSF.parse_date_code(serial)
    if (date) {
      return new Date(date.y, date.m - 1, date.d).toISOString()
    }
  }
  const d = new Date(value)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

// ─── Режим ШАБЛОН ─────────────────────────────────────────────────────────────

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

    // Fallback: проект з фіксованої клітинки
    const projRef = parseCellRef(config.projectCell)
    const projectFallback = projRef
      ? (getCellValue(ws, projRef.col, projRef.row) ?? sheetName)
      : sheetName

    // Fallback: дата з фіксованої клітинки
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

      const company      = companyColIdx >= 0 ? getCellValue(ws, companyColIdx, r) : null
      const projectName  = projectColIdx  >= 0 ? getCellValue(ws, projectColIdx, r) : null

      const rawAccessType    = accessTypeColIdx >= 0 ? getCellValue(ws, accessTypeColIdx, r) : null
      const parsedAccessType = parseAccessType(rawAccessType)

      let expiresAt: string | null = expiresAtFixed
      if (expiresAtColIdx >= 0) {
        expiresAt = parseDate(getCellValue(ws, expiresAtColIdx, r))
      }

      const accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE' =
        parsedAccessType ?? (expiresAt ? 'TEMPORARY' : 'PERMANENT')

      const contactName  = contactNameColIdx  >= 0 ? getCellValue(ws, contactNameColIdx, r)  : null
      const contactPhone = contactPhoneColIdx >= 0 ? getCellValue(ws, contactPhoneColIdx, r) : null
      const note         = noteColIdx         >= 0 ? getCellValue(ws, noteColIdx, r)         : null

      vehicles.push({
        plate,
        digits: extractDigits(plate),
        company: company ?? projectFallback,
        project: projectName,
        contactName,
        contactPhone,
        accessType,
        expiresAt: expiresAt ?? null,
        note,
      })
    }

    results.push({ sheetName, project: projectFallback, expiresAt: expiresAtFixed, vehicles, errors, selected: true })
  }

  return results
}

// ─── Режим ДОВІЛЬНИЙ ──────────────────────────────────────────────────────────

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
    const projectColIdx      = config.projectCol     ? colLetterToIndex(config.projectCol)     : -1
    const companyColIdx      = config.companyCol     ? colLetterToIndex(config.companyCol)     : -1
    const accessTypeColIdx   = config.accessTypeCol  ? colLetterToIndex(config.accessTypeCol)  : -1
    const dateToColIdx       = config.dateToCol      ? colLetterToIndex(config.dateToCol)      : -1
    const contactNameColIdx  = config.contactNameCol ? colLetterToIndex(config.contactNameCol) : -1
    const contactPhoneColIdx = config.contactPhoneCol? colLetterToIndex(config.contactPhoneCol): -1
    const noteColIdx         = config.noteCol        ? colLetterToIndex(config.noteCol)        : -1

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
        ? (getCellValue(ws, companyColIdx, r) ?? projectName ?? config.projectFixed ?? 'Невідомо')
        : (projectName ?? config.projectFixed ?? 'Невідомо')

      const rawDate    = dateToColIdx >= 0 ? getCellValue(ws, dateToColIdx, r) : null
      const expiresAt  = parseDate(rawDate)

      const rawAccessType    = accessTypeColIdx >= 0 ? getCellValue(ws, accessTypeColIdx, r) : null
      const parsedAccessType = parseAccessType(rawAccessType)
      const accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE' =
        parsedAccessType ?? (expiresAt ? 'TEMPORARY' : 'PERMANENT')

      const contactName  = contactNameColIdx  >= 0 ? getCellValue(ws, contactNameColIdx, r)  : null
      const contactPhone = contactPhoneColIdx >= 0 ? getCellValue(ws, contactPhoneColIdx, r) : null
      const note         = noteColIdx         >= 0 ? getCellValue(ws, noteColIdx, r)         : null

      vehicles.push({
        plate,
        digits: extractDigits(plate),
        company,
        project: projectName,
        contactName,
        contactPhone,
        accessType,
        expiresAt,
        note,
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

// ─── Отримати список листів ───────────────────────────────────────────────────

export function getSheetNames(buffer: Buffer): string[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  return wb.SheetNames
}