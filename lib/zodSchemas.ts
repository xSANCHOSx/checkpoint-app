/**
 * Централізовані Zod-схеми для валідації вхідних даних API.
 * Використовувати у всіх route.ts перед записом у БД.
 */
import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z
    .string({ required_error: 'Логін обов\'язковий' })
    .min(1, 'Логін не може бути порожнім')
    .max(64, 'Логін занадто довгий'),
  password: z
    .string({ required_error: 'Пароль обов\'язковий' })
    .min(1, 'Пароль не може бути порожнім')
    .max(256, 'Пароль занадто довгий'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ─── Checkpoint ───────────────────────────────────────────────────────────────

export const checkpointSchema = z.object({
  plate: z
    .string({ required_error: 'Номер авто обов\'язковий' })
    .min(4, 'Номер авто занадто короткий')
    .max(20, 'Номер авто занадто довгий'),
  result: z
    .enum(['ALLOWED', 'DENIED', 'UNKNOWN'])
    .default('UNKNOWN'),
  vehicleId: z.number().int().positive().nullable().optional(),
  operatorId: z.string().max(64).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  timestamp: z
    .string()
    .datetime({ message: 'Невірний формат timestamp' })
    .optional(),
})

export type CheckpointInput = z.infer<typeof checkpointSchema>

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsPatchSchema = z.object({
  operatorAuthRequired: z.boolean({
    required_error: 'operatorAuthRequired обов\'язковий',
    invalid_type_error: 'operatorAuthRequired повинен бути boolean',
  }),
})

export type SettingsPatchInput = z.infer<typeof settingsPatchSchema>

// ─── Batch Logs ───────────────────────────────────────────────────────────────

export const logEntrySchema = z.object({
  plate: z
    .string()
    .min(1, 'Номер авто порожній')
    .max(20, 'Номер авто занадто довгий'),
  result: z.enum(['ALLOWED', 'DENIED', 'UNKNOWN']).default('UNKNOWN'),
  vehicleId: z.number().int().positive().nullable().optional(),
  operatorId: z.string().max(64).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  timestamp: z.string().optional(),
  clientId: z.string().max(64).optional(), // UUID для дедуплікації офлайн-логів
})

export const batchLogsSchema = z.array(logEntrySchema).max(500)

export type LogEntry = z.infer<typeof logEntrySchema>

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Форматує Zod-помилки у зрозумілий рядок */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
}
