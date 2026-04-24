'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  parseTemplateMode,
  parseCustomMode,
  getSheetNames,
  type ParsedSheet,
  type TemplateConfig,
  type CustomConfig,
} from '@/lib/excelParserCustom'

// ─── Типи ─────────────────────────────────────────────────────────────────────

type Mode = 'template' | 'custom'
type Source = 'gdrive' | 'file'

// ─── Стан форми ───────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE: Omit<TemplateConfig, 'mode'> = {
  projectCell: 'B2',
  dateCell:    'D3',
  vehicleCol:  'A',
  startRow:    5,
}

const DEFAULT_CUSTOM: Omit<CustomConfig, 'mode'> = {
  plateCol:     'A',
  projectCol:   '',
  projectFixed: '',
  dateToCol:    '',
  dataStartRow: 2,
}

// ─── Головний компонент ────────────────────────────────────────────────────────

export default function ImportPage() {
  const [mode, setMode]     = useState<Mode>('template')
  const [source, setSource] = useState<Source>('gdrive')

  const [gdriveUrl, setGdriveUrl] = useState('')
  const [tmpl, setTmpl]           = useState(DEFAULT_TEMPLATE)
  const [custom, setCustom]       = useState(DEFAULT_CUSTOM)

  const [sheets, setSheets]               = useState<ParsedSheet[]>([])
  const [sheetList, setSheetList]         = useState<string[]>([])    // для template — список листів
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set())

  const [status, setStatus]   = useState<'idle' | 'loading' | 'parsed' | 'saving' | 'done'>('idle')
  const [error, setError]     = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ imported: number; updated: number } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

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
      return Buffer.from(await res.arrayBuffer())
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
    setSaveResult(null)
    setStatus('loading')

    try {
      const buf = await loadBuffer()
      if (!buf) { setStatus('idle'); return }

      if (mode === 'template') {
        // Спочатку отримати список листів для вибору
        const names = getSheetNames(buf)
        setSheetList(names)
        setSelectedSheets(new Set(names))

        const config: TemplateConfig = { mode: 'template', ...tmpl }
        const parsed = parseTemplateMode(buf, config)
        setSheets(parsed)
      } else {
        const config: CustomConfig = { mode: 'custom', ...custom }
        const parsed = parseCustomMode(buf, config)
        setSheets(parsed)
      }

      setStatus('parsed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка парсингу')
      setStatus('idle')
    }
  }

  // ─── Тоггл вибору аркуша ──────────────────────────────────────────────────

  const toggleSheet = (name: string) => {
    setSelectedSheets(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  // ─── Збереження ───────────────────────────────────────────────────────────

  const handleSave = async () => {
    const vehicles = sheets
      .filter(s => selectedSheets.has(s.sheetName))
      .flatMap(s => s.vehicles)

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
    } catch {
      setError('Помилка мережі')
      setStatus('parsed')
    }
  }

  // ─── Рендер ───────────────────────────────────────────────────────────────

  const totalVehicles = sheets
    .filter(s => selectedSheets.has(s.sheetName))
    .reduce((sum, s) => sum + s.vehicles.length, 0)

  const totalErrors = sheets.flatMap(s => s.errors).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Адмін</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-bold text-gray-800">📊 Імпорт Excel</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Режим парсингу ── */}
        <Section title="1. Режим парсингу">
          <div className="flex gap-3">
            <ModeBtn active={mode === 'template'} onClick={() => { setMode('template'); setSheets([]) }}>
              📋 По листах (шаблон)
            </ModeBtn>
            <ModeBtn active={mode === 'custom'} onClick={() => { setMode('custom'); setSheets([]) }}>
              ⚙️ Довільні колонки
            </ModeBtn>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'template'
              ? 'Кожен лист — окремий проект. Назва і дата беруться з фіксованих клітинок.'
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
              💾 Файл з комп'ютера
            </ModeBtn>
          </div>

          {source === 'gdrive' ? (
            <div>
              <label className="label">Посилання на файл</label>
              <input
                type="url"
                value={gdriveUrl}
                onChange={e => setGdriveUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... або https://drive.google.com/file/d/..."
                className="input w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Файл повинен бути відкритий для перегляду («Усі, хто має посилання»).
                Підтримуються Google Sheets та .xlsx на Drive.
              </p>
            </div>
          ) : (
            <div>
              <label className="label">Файл Excel (.xlsx, .xls)</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="input-file" />
            </div>
          )}
        </Section>

        {/* ── Налаштування парсингу ── */}
        <Section title="3. Налаштування колонок">
          {mode === 'template' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Клітинка проекту" hint="напр. B2">
                <input className="input" value={tmpl.projectCell}
                  onChange={e => setTmpl(p => ({ ...p, projectCell: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Клітинка дати закінч." hint="напр. D3">
                <input className="input" value={tmpl.dateCell}
                  onChange={e => setTmpl(p => ({ ...p, dateCell: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Колонка авто" hint="напр. A">
                <input className="input" value={tmpl.vehicleCol}
                  onChange={e => setTmpl(p => ({ ...p, vehicleCol: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Авто з рядка" hint="напр. 5">
                <input className="input" type="number" min={1} value={tmpl.startRow}
                  onChange={e => setTmpl(p => ({ ...p, startRow: parseInt(e.target.value) || 1 }))} />
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Колонка номерів авто *" hint="напр. A">
                  <input className="input" value={custom.plateCol}
                    onChange={e => setCustom(p => ({ ...p, plateCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка проекту" hint="напр. B (або залиш порожнім)">
                  <input className="input" value={custom.projectCol}
                    onChange={e => setCustom(p => ({ ...p, projectCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Колонка «дійсний до»" hint="напр. C">
                  <input className="input" value={custom.dateToCol}
                    onChange={e => setCustom(p => ({ ...p, dateToCol: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="Дані з рядка" hint="напр. 2">
                  <input className="input" type="number" min={1} value={custom.dataStartRow}
                    onChange={e => setCustom(p => ({ ...p, dataStartRow: parseInt(e.target.value) || 1 }))} />
                </Field>
              </div>
              {!custom.projectCol && (
                <Field label="Фіксована назва проекту" hint="якщо колонка проекту не задана">
                  <input className="input w-full" value={custom.projectFixed}
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
            <button onClick={() => { setSheets([]); setStatus('idle'); setSaveResult(null) }}
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

            {/* Кнопка збереження */}
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={status === 'saving' || totalVehicles === 0}
                className="btn-primary"
              >
                {status === 'saving'
                  ? '⏳ Збереження...'
                  : `💾 Імпортувати ${totalVehicles} авто`}
              </button>
              <span className="text-xs text-gray-400">
                Існуючі записи будуть оновлені, нові — додані.
              </span>
            </div>
          </Section>
        )}

      </main>

      {/* Глобальні стилі для цієї сторінки */}
      <style jsx global>{`
        .label  { display:block; font-size:.75rem; font-weight:600; color:#6b7280; margin-bottom:.25rem; }
        .input  { width:100%; border:1px solid #e5e7eb; border-radius:.5rem; padding:.4rem .6rem;
                  font-size:.875rem; outline:none; }
        .input:focus { border-color:#3b82f6; box-shadow:0 0 0 2px #bfdbfe; }
        .input-file { font-size:.875rem; }
        .btn-primary   { padding:.5rem 1.25rem; background:#2563eb; color:#fff; border-radius:.75rem;
                         font-size:.875rem; font-weight:500; transition:background .15s;
                         disabled:opacity-40 disabled:cursor-not-allowed; }
        .btn-primary:hover:not(:disabled) { background:#1d4ed8; }
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
      {/* Заголовок аркуша */}
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

      {/* Список авто */}
      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {sheet.vehicles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sheet.vehicles.map((v, i) => (
                <span key={i} className="text-xs font-mono bg-blue-50 text-blue-800 px-2 py-1 rounded-md">
                  {v.plate}
                </span>
              ))}
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
