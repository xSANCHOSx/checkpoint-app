'use client'
import { AdminHeader } from '@/components/admin/AdminHeader'
import {
  getSheetNames,
  parseCustomMode,
  parseTemplateMode,
  type CustomConfig,
  type ParsedSheet,
  type ParsedVehicle,
  type TemplateConfig,
} from '@/lib/excelParserCustom'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Типи ─────────────────────────────────────────────────────────────────────

type Mode   = 'template' | 'custom'
type Source = 'gdrive'   | 'file'

interface DuplicateEntry {
  plate:    string
  include:  boolean
}

interface RecentEntry {
  label: string   // коротка назва для відображення
  url:   string   // повне посилання
  addedAt: number // timestamp
}

const RECENT_KEY    = 'import_recent_gdrive'
const RECENT_LIMIT  = 5

function loadRecent(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecent(url: string) {
  const label = url.replace(/^https?:\/\/(docs\.google\.com|drive\.google\.com)\//, '').slice(0, 60)
  const prev  = loadRecent().filter(r => r.url !== url)
  const next: RecentEntry[] = [{ label, url, addedAt: Date.now() }, ...prev].slice(0, RECENT_LIMIT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

// ─── Дефолти ──────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE: Omit<TemplateConfig, 'mode'> = {
  projectCell:       '',
  dateCell:          '',
  vehicleCol:        '',
  startRow:          1,
  companyCol:        '',
  projectColPerRow:  '',
  accessTypeCol:     '',
  expiresAtColPerRow:'',
  contactNameCol:    '',
  contactPhoneCol:   '',
  noteCol:           '',
}

const DEFAULT_CUSTOM: Omit<CustomConfig, 'mode'> = {
  plateCol:       'A',
  companyCol:     'B',
  projectCol:     'C',
  accessTypeCol:  'D',
  dateToCol:      'E',  
  contactNameCol: 'F',
  contactPhoneCol:'',
  noteCol:        'G',
  projectFixed:   '',
  dataStartRow:   2,
}

// ─── Головний компонент ────────────────────────────────────────────────────────

export default function ImportPage() {
  const [mode, setMode]     = useState<Mode>('template')
  const [source, setSource] = useState<Source>('gdrive')

  const [gdriveUrl, setGdriveUrl] = useState('')
  const [recentFiles, setRecentFiles] = useState<RecentEntry[]>([])
  const [showRecent, setShowRecent]   = useState(false)
  const [tmpl, setTmpl]           = useState(DEFAULT_TEMPLATE)
  const [custom, setCustom]       = useState(DEFAULT_CUSTOM)

  const [sheets, setSheets]                   = useState<ParsedSheet[]>([])
  const [sheetList, setSheetList]             = useState<string[]>([])
  const [selectedSheets, setSelectedSheets]   = useState<Set<string>>(new Set())

  // Дублікати
  const [duplicates, setDuplicates]           = useState<DuplicateEntry[]>([])
  const [showDuplicates, setShowDuplicates]   = useState(false)
  const [checkingDups, setCheckingDups]       = useState(false)

  const [status, setStatus]   = useState<'idle' | 'loading' | 'parsed' | 'saving' | 'done'>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ imported: number; updated: number } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  // Завантажуємо недавні файли при монтуванні
  useEffect(() => {
    setRecentFiles(loadRecent())
  }, [])

  // ─── Завантаження файлу ───────────────────────────────────────────────────

  const loadBuffer = useCallback(async (): Promise<Buffer | null> => {
    if (source === 'gdrive') {
      if (!gdriveUrl.trim()) { setError('Введіть посилання на Google Drive'); return null }
      const res = await fetch('/api/import/gdrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: gdriveUrl.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Помилка завантаження файлу')
        return null
      }
      const buf = Buffer.from(await res.arrayBuffer())
      // Зберігаємо в недавні після успішного завантаження
      saveRecent(gdriveUrl.trim())
      setRecentFiles(loadRecent())
      return buf
    } else {
      const file = fileRef.current?.files?.[0]
      if (!file) { setError('Виберіть файл'); return null }
      return Buffer.from(await file.arrayBuffer())
    }
  }, [source, gdriveUrl])

  // ─── Аналіз файлу ─────────────────────────────────────────────────────────

  const handleParse = async () => {
    setError(null)
    setSheets([])
    setDuplicates([])
    setShowDuplicates(false)
    setSaveResult(null)
    setStatus('loading')

    try {
      const buf = await loadBuffer()
      if (!buf) { setStatus('idle'); return }

      if (mode === 'template') {
        const names = getSheetNames(buf)
        setSheetList(names)
        setSelectedSheets(new Set(names))

        const optionalStr = (v: string) => v.trim() || undefined
        const config: TemplateConfig = {
          mode: 'template',
          projectCell:        tmpl.projectCell,
          dateCell:           tmpl.dateCell,
          vehicleCol:         tmpl.vehicleCol,
          startRow:           tmpl.startRow,
          companyCol:         optionalStr(tmpl.companyCol ?? ''),
          projectColPerRow:   optionalStr(tmpl.projectColPerRow ?? ''),
          accessTypeCol:      optionalStr(tmpl.accessTypeCol ?? ''),
          expiresAtColPerRow: optionalStr(tmpl.expiresAtColPerRow ?? ''),
          contactNameCol:     optionalStr(tmpl.contactNameCol ?? ''),
          contactPhoneCol:    optionalStr(tmpl.contactPhoneCol ?? ''),
          noteCol:            optionalStr(tmpl.noteCol ?? ''),
        }
        const parsed = parseTemplateMode(buf, config)
        setSheets(parsed)
      } else {
        const optionalStr = (v: string | undefined) => v?.trim() || undefined
        const config: CustomConfig = {
          mode: 'custom',
          plateCol:       custom.plateCol,
          companyCol:     optionalStr(custom.companyCol),
          projectCol:     optionalStr(custom.projectCol),
          accessTypeCol:  optionalStr(custom.accessTypeCol),
          dateToCol:      optionalStr(custom.dateToCol),
          contactNameCol: optionalStr(custom.contactNameCol),
          contactPhoneCol:optionalStr(custom.contactPhoneCol),
          noteCol:        optionalStr(custom.noteCol),
          projectFixed:   custom.projectFixed || undefined,
          dataStartRow:   custom.dataStartRow,
        }
        const parsed = parseCustomMode(buf, config)
        setSheets(parsed)
        setSelectedSheets(new Set(parsed.map(s => s.sheetName)))
      }

      setStatus('parsed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка парсингу')
      setStatus('idle')
    }
  }

  // ─── Перевірка дублікатів ─────────────────────────────────────────────────

  const handleCheckDuplicates = async () => {
    const allPlates = sheets
      .filter(s => selectedSheets.has(s.sheetName))
      .flatMap(s => s.vehicles.map(v => v.plate))

    if (allPlates.length === 0) { setError('Немає авто для перевірки'); return }

    setCheckingDups(true)
    setError(null)
    try {
      const res = await fetch('/api/import/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plates: allPlates }),
      })
      const j = await res.json()
      const existing: string[] = j.existing ?? []

      if (existing.length === 0) {
        // Немає дублікатів — одразу зберігаємо
        setDuplicates([])
        setShowDuplicates(false)
        await doSave([])
      } else {
        setDuplicates(existing.map(plate => ({ plate, include: true })))
        setShowDuplicates(true)
      }
    } catch {
      setError('Помилка перевірки дублікатів')
    } finally {
      setCheckingDups(false)
    }
  }

  // ─── Перемикач дублікату ──────────────────────────────────────────────────

  const toggleDuplicate = (plate: string) => {
    setDuplicates(prev => prev.map(d => d.plate === plate ? { ...d, include: !d.include } : d))
  }

  const toggleAllDuplicates = (include: boolean) => {
    setDuplicates(prev => prev.map(d => ({ ...d, include })))
  }

  // ─── Збереження ───────────────────────────────────────────────────────────

  const doSave = async (dups: DuplicateEntry[]) => {
    const skipSet = new Set(dups.filter(d => !d.include).map(d => d.plate))

    const vehicles = sheets
      .filter(s => selectedSheets.has(s.sheetName))
      .flatMap(s => s.vehicles)
      .filter(v => !skipSet.has(v.plate))

    if (vehicles.length === 0) { setError('Немає авто для збереження'); return }

    setStatus('saving')
    setError(null)
    try {
      const res = await fetch('/api/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'Помилка збереження'); setStatus('parsed'); return }
      setSaveResult({ imported: j.imported, updated: j.updated })
      setStatus('done')
      setShowDuplicates(false)
    } catch {
      setError('Помилка мережі')
      setStatus('parsed')
    }
  }

  const handleSave = () => doSave(duplicates)

  // ─── Тоггл аркуша ─────────────────────────────────────────────────────────

  const toggleSheet = (name: string) => {
    setSelectedSheets(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // ─── Підрахунок ───────────────────────────────────────────────────────────

  const totalVehicles  = sheets
    .filter(s => selectedSheets.has(s.sheetName))
    .reduce((sum, s) => sum + s.vehicles.length, 0)

  const totalErrors = sheets.flatMap(s => s.errors).length

  const dupIncluded = duplicates.filter(d => d.include).length
  const dupSkipped  = duplicates.filter(d => !d.include).length

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="📊 Імпорт Excel" />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Режим парсингу ── */}
        <Section title="1. Режим парсингу">
          <div className="flex gap-3">
            <ModeBtn active={mode === 'template'} onClick={() => { setMode('template'); setSheets([]) }}>
              📋 По шаблону
            </ModeBtn>
            <ModeBtn active={mode === 'custom'} onClick={() => { setMode('custom'); setSheets([]) }}>
              ⚙️ Довільні колонки
            </ModeBtn>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'template'
              ? 'Стандартний шаблон: Номер(A), Компанія(B), Проект(C), Тип(D), Дійсний до(E). Всі колонки налаштовуються.'
              : 'Один або кілька листів з довільною структурою. Ви вказуєте які колонки читати.'}
          </p>
        </Section>

        {/* ── Джерело файлу ── */}
        <Section title="2. Джерело файлу">
          <div className="flex gap-3 mb-4">
            <ModeBtn active={source === 'gdrive'} onClick={() => setSource('gdrive')}>
              ☁️ Google Drive / Sheets
            </ModeBtn>
            <ModeBtn active={source === 'file'} onClick={() => setSource('file')}>
              💾 Файл з комп&apos;ютера
            </ModeBtn>
          </div>

          {source === 'gdrive' ? (
            <div>
              <label className="label">Посилання на файл</label>
              <div className="relative">
                <input
                  type="url"
                  value={gdriveUrl}
                  onChange={e => { setGdriveUrl(e.target.value); setShowRecent(false) }}
                  onFocus={() => recentFiles.length > 0 && setShowRecent(true)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="input w-full pr-24"
                />
                {recentFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRecent(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md whitespace-nowrap"
                  >
                    🕐 Недавні ({recentFiles.length})
                  </button>
                )}
              </div>

              {/* Список недавніх */}
              {showRecent && recentFiles.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500">Останні файли</span>
                    <button
                      onClick={() => {
                        localStorage.removeItem(RECENT_KEY)
                        setRecentFiles([])
                        setShowRecent(false)
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Очистити
                    </button>
                  </div>
                  {recentFiles.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setGdriveUrl(r.url); setShowRecent(false) }}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="text-sm text-blue-700 font-medium truncate">{r.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{r.url}</div>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-1">
                Файл повинен бути відкритий для перегляду. Підтримуються Google Sheets та .xlsx на Drive.
              </p>
            </div>
          ) : (
            <div>
              <label className="label">Файл Excel (.xlsx, .xls)</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm" className="input-file" />
            </div>
          )}
        </Section>

        {/* ── Налаштування колонок ── */}
        <Section title="3. Налаштування колонок">
          {mode === 'template' ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Залиш колонку порожньою — значення не читатиметься.
                Проект/дата з фіксованих клітинок — fallback якщо per-row колонки не задані.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Колонка номера *" hint="напр. A">
                  <input className="input" value={tmpl.vehicleCol}
                    onChange={e => setTmpl(p => ({ ...p, vehicleCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка компанії" hint="напр. B">
                  <input className="input" value={tmpl.companyCol ?? ''}
                    onChange={e => setTmpl(p => ({ ...p, companyCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка проекту" hint="напр. C">
                  <input className="input" value={tmpl.projectColPerRow ?? ''}
                    onChange={e => setTmpl(p => ({ ...p, projectColPerRow: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка типу доступу" hint="напр. D">
                  <input className="input" value={tmpl.accessTypeCol ?? ''}
                    onChange={e => setTmpl(p => ({ ...p, accessTypeCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка «дійсний до»" hint="напр. E">
                  <input className="input" value={tmpl.expiresAtColPerRow ?? ''}
                    onChange={e => setTmpl(p => ({ ...p, expiresAtColPerRow: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка контакту" hint="напр. F (необов.)">
                  <input className="input" value={tmpl.contactNameCol ?? ''}
                    onChange={e => setTmpl(p => ({ ...p, contactNameCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка телефону" hint="напр. G (необов.)">
                  <input className="input" value={tmpl.contactPhoneCol ?? ''}
                    onChange={e => setTmpl(p => ({ ...p, contactPhoneCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка примітки" hint="напр. H (необов.)">
                  <input className="input" value={tmpl.noteCol ?? ''}
                    onChange={e => setTmpl(p => ({ ...p, noteCol: e.target.value.toUpperCase() }))} />
                </Field>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-gray-400 mb-2">Fallback (якщо per-row колонки порожні)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Клітинка проекту" hint="напр. B2">
                    <input className="input" value={tmpl.projectCell}
                      onChange={e => setTmpl(p => ({ ...p, projectCell: e.target.value.toUpperCase() }))} />
                  </Field>
                  <Field label="Клітинка дати" hint="напр. D3">
                    <input className="input" value={tmpl.dateCell}
                      onChange={e => setTmpl(p => ({ ...p, dateCell: e.target.value.toUpperCase() }))} />
                  </Field>
                  <Field label="Дані з рядка" hint="напр. 2">
                    <input className="input" type="number" min={1} value={tmpl.startRow}
                      onChange={e => setTmpl(p => ({ ...p, startRow: parseInt(e.target.value) || 1 }))} />
                  </Field>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Колонка номерів *" hint="напр. A">
                  <input className="input" value={custom.plateCol}
                    onChange={e => setCustom(p => ({ ...p, plateCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка компанії" hint="напр. B">
                  <input className="input" value={custom.companyCol ?? ''}
                    onChange={e => setCustom(p => ({ ...p, companyCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка проекту" hint="напр. C">
                  <input className="input" value={custom.projectCol ?? ''}
                    onChange={e => setCustom(p => ({ ...p, projectCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка типу доступу" hint="напр. D">
                  <input className="input" value={custom.accessTypeCol ?? ''}
                    onChange={e => setCustom(p => ({ ...p, accessTypeCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка «дійсний до»" hint="напр. E">
                  <input className="input" value={custom.dateToCol ?? ''}
                    onChange={e => setCustom(p => ({ ...p, dateToCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка контакту" hint="напр. F (необов.)">
                  <input className="input" value={custom.contactNameCol ?? ''}
                    onChange={e => setCustom(p => ({ ...p, contactNameCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка телефону" hint="напр. G (необов.)">
                  <input className="input" value={custom.contactPhoneCol ?? ''}
                    onChange={e => setCustom(p => ({ ...p, contactPhoneCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка примітки" hint="напр. H (необов.)">
                  <input className="input" value={custom.noteCol ?? ''}
                    onChange={e => setCustom(p => ({ ...p, noteCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Дані з рядка" hint="напр. 2">
                  <input className="input" type="number" min={1} value={custom.dataStartRow}
                    onChange={e => setCustom(p => ({ ...p, dataStartRow: parseInt(e.target.value) || 1 }))} />
                </Field>
              </div>
              {!custom.projectCol && (
                <Field label="Фіксована назва проекту" hint="якщо колонка проекту не задана">
                  <input className="input w-full" value={custom.projectFixed ?? ''}
                    onChange={e => setCustom(p => ({ ...p, projectFixed: e.target.value }))}
                    placeholder="напр. Об'єкт №12" />
                </Field>
              )}
            </div>
          )}
        </Section>

        {/* ── Кнопка аналізу ── */}
        <div className="flex gap-3">
          <button
            onClick={handleParse}
            disabled={status === 'loading' || status === 'saving'}
            className="btn-primary"
          >
            {status === 'loading' ? '⏳ Завантаження...' : '🔍 Аналізувати'}
          </button>
          {sheets.length > 0 && (
            <button onClick={() => { setSheets([]); setStatus('idle'); setSaveResult(null); setDuplicates([]); setShowDuplicates(false) }}
              className="btn-secondary">
              Очистити
            </button>
          )}
        </div>

        {/* ── Помилка ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* ── Результат збереження ── */}
        {status === 'done' && saveResult && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
            ✅ Збережено: {saveResult.imported} нових, {saveResult.updated} оновлених
          </div>
        )}

        {/* ── Превью ── */}
        {sheets.length > 0 && status !== 'done' && (
          <Section title="4. Перегляд та імпорт">

            {/* Статистика */}
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <Stat label="Листів" value={sheets.length} />
              <Stat label="Обрано" value={selectedSheets.size} />
              <Stat label="Авто до імпорту" value={totalVehicles} accent />
              {totalErrors > 0 && <Stat label="Помилок" value={totalErrors} warn />}
            </div>

            {/* Список листів */}
            <div className="space-y-4">
              {sheets.map(sheet => (
                <SheetPreview
                  key={sheet.sheetName}
                  sheet={sheet}
                  selected={selectedSheets.has(sheet.sheetName)}
                  onToggle={() => toggleSheet(sheet.sheetName)}
                />
              ))}
            </div>

            {/* Панель дублікатів */}
            {showDuplicates && duplicates.length > 0 && (
              <div className="mt-6 border border-yellow-200 bg-yellow-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-yellow-800 text-sm">
                    ⚠️ Знайдено {duplicates.length} номерів, що вже є в базі
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAllDuplicates(true)}
                      className="text-xs px-2 py-1 bg-white border border-yellow-300 rounded-lg text-yellow-700 hover:bg-yellow-100">
                      Оновити всі
                    </button>
                    <button onClick={() => toggleAllDuplicates(false)}
                      className="text-xs px-2 py-1 bg-white border border-yellow-300 rounded-lg text-yellow-700 hover:bg-yellow-100">
                      Пропустити всі
                    </button>
                  </div>
                </div>
                <p className="text-xs text-yellow-700 mb-3">
                  Оберіть які номери оновити (✓), а які пропустити (✗):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {duplicates.map(d => (
                    <label key={d.plate}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        d.include
                          ? 'bg-orange-100 border-orange-300 text-orange-800'
                          : 'bg-white border-gray-200 text-gray-400 line-through'
                      }`}>
                      <input
                        type="checkbox"
                        checked={d.include}
                        onChange={() => toggleDuplicate(d.plate)}
                        className="w-3.5 h-3.5 accent-orange-500"
                      />
                      <span className="font-mono font-medium">{d.plate}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-yellow-700">
                  <span>✓ Оновити: <strong>{dupIncluded}</strong></span>
                  <span>✗ Пропустити: <strong>{dupSkipped}</strong></span>
                </div>
              </div>
            )}

            {/* Кнопка збереження */}
            <div className="mt-6 flex items-center gap-4">
              {!showDuplicates ? (
                <button
                  onClick={handleCheckDuplicates}
                  disabled={checkingDups || status === 'saving' || totalVehicles === 0}
                  className="btn-primary"
                >
                  {checkingDups
                    ? '⏳ Перевірка...'
                    : `💾 Імпортувати ${totalVehicles} авто`}
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={status === 'saving'}
                  className="btn-primary"
                >
                  {status === 'saving'
                    ? '⏳ Збереження...'
                    : `✅ Підтвердити імпорт (${totalVehicles - dupSkipped} авто)`}
                </button>
              )}
              <span className="text-xs text-gray-400">
                {showDuplicates
                  ? 'Обрані дублікати будуть оновлені, решта — пропущена.'
                  : 'Спочатку перевіримо наявність дублікатів у базі.'}
              </span>
            </div>
          </Section>
        )}

      </main>

      <style jsx global>{`
        .label  { display:block; font-size:.75rem; font-weight:600; color:#6b7280; margin-bottom:.25rem; }
        .input  { width:100%; border:1px solid #e5e7eb; border-radius:.5rem; padding:.4rem .6rem;
                  font-size:.875rem; outline:none; }
        .input:focus { border-color:#3b82f6; box-shadow:0 0 0 2px #bfdbfe; }
        .input-file { font-size:.875rem; }
        .btn-primary   { padding:.5rem 1.25rem; background:#2563eb; color:#fff; border-radius:.75rem;
                         font-size:.875rem; font-weight:500; transition:background .15s; }
        .btn-primary:hover:not(:disabled) { background:#1d4ed8; }
        .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
        .btn-secondary { padding:.5rem 1.25rem; background:#f3f4f6; color:#374151;
                         border-radius:.75rem; font-size:.875rem; font-weight:500; }
        .btn-secondary:hover { background:#e5e7eb; }
      `}</style>
    </div>
  )
}

// ─── Допоміжні компоненти ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function ModeBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Stat({ label, value, accent, warn }: {
  label: string; value: number; accent?: boolean; warn?: boolean
}) {
  return (
    <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
      warn ? 'bg-red-50 text-red-700' :
      accent ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
    }`}>
      {label}: <span className="font-bold">{value}</span>
    </div>
  )
}

function SheetPreview({ sheet, selected, onToggle }: {
  sheet: ParsedSheet; selected: boolean; onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      selected ? 'border-blue-200' : 'border-gray-200 opacity-60'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 accent-blue-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{sheet.project}</span>
            <span className="text-xs text-gray-400">({sheet.sheetName})</span>
            {sheet.expiresAt && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                до {new Date(sheet.expiresAt).toLocaleDateString('uk-UA')}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {sheet.vehicles.length} авто
            {sheet.errors.length > 0 && ` · ${sheet.errors.length} помилок`}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          {expanded ? 'Згорнути ▲' : 'Переглянути ▼'}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {sheet.vehicles.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-500">
                    <th className="text-left px-2 py-1 rounded-l">Номер</th>
                    <th className="text-left px-2 py-1">Компанія</th>
                    <th className="text-left px-2 py-1">Проект</th>
                    <th className="text-left px-2 py-1">Тип</th>
                    <th className="text-left px-2 py-1">Дійсний до</th>
                    <th className="text-left px-2 py-1">Контакт</th>
                    <th className="text-left px-2 py-1 rounded-r">Примітка</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.vehicles.map((v: ParsedVehicle, i: number) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1 font-mono font-semibold text-blue-800">{v.plate}</td>
                      <td className="px-2 py-1 text-gray-700">{v.company || '—'}</td>
                      <td className="px-2 py-1 text-gray-700">{v.project || '—'}</td>
                      <td className="px-2 py-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          v.accessType === 'PERMANENT'  ? 'bg-green-100 text-green-700' :
                          v.accessType === 'SINGLE_USE' ? 'bg-purple-100 text-purple-700' :
                                                          'bg-orange-100 text-orange-700'
                        }`}>
                          {v.accessType === 'PERMANENT' ? 'Постійний' :
                           v.accessType === 'SINGLE_USE' ? 'Разовий' : 'Тимчасовий'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-gray-600">
                        {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('uk-UA') : '—'}
                      </td>
                      <td className="px-2 py-1 text-gray-600">
                        {v.contactName ? `${v.contactName}${v.contactPhone ? ` · ${v.contactPhone}` : ''}` : '—'}
                      </td>
                      <td className="px-2 py-1 text-gray-500">{v.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sheet.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {sheet.errors.map((e, i) => (
                <div key={i} className="text-xs text-red-500">⚠ {e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}