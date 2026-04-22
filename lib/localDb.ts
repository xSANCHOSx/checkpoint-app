import Dexie, { type Table } from 'dexie'

export interface LocalVehicle {
  id: number
  plate: string
  digits: string
  company: string
  contactName: string | null
  contactPhone: string | null
  accessType: 'PERMANENT' | 'TEMPORARY'
  expiresAt: string | null  // ISO string
  isExpired: boolean
  note: string | null
  updatedAt: string         // ISO string — для delta-sync
}

export interface PendingLog {
  id?: number           // autoincrement
  plate: string
  vehicleId: number | null
  result: 'ALLOWED' | 'DENIED' | 'UNKNOWN'
  operatorId: string | null
  note: string | null
  timestamp: string     // ISO string — реальний час події
  synced: number        // 0 = не синхронізовано, 1 = синхронізовано
}

class CheckpointDB extends Dexie {
  vehicles!: Table<LocalVehicle>
  pendingLogs!: Table<PendingLog>

  constructor() {
    super('checkpoint_db')

    this.version(1).stores({
      vehicles: 'id, digits, plate, isExpired, accessType',
      pendingLogs: '++id, synced, timestamp',
    })
  }
}

// Singleton
export const localDb = new CheckpointDB()

// Пошук за цифрами
export async function searchLocal(digits: string): Promise<LocalVehicle[]> {
  if (digits.length < 2) return []
  return localDb.vehicles.filter(v => v.digits.includes(digits)).toArray()
}

// Збереження офлайн-логу
export async function savePendingLog(
  log: Omit<PendingLog, 'id' | 'synced'>
): Promise<void> {
  await localDb.pendingLogs.add({ ...log, synced: 0 })
}

// Отримати несинхронізовані логи
export async function getPendingLogs(): Promise<PendingLog[]> {
  return localDb.pendingLogs.where('synced').equals(0).toArray()
}

// Позначити логи як синхронізовані
export async function markLogsSynced(ids: number[]): Promise<void> {
  await localDb.pendingLogs.where('id').anyOf(ids).modify({ synced: 1 })
}

// Кількість несинхронізованих логів
export async function getPendingCount(): Promise<number> {
  return localDb.pendingLogs.where('synced').equals(0).count()
}
