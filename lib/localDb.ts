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

export interface LocalEmergencyVehicle {
  id: number
  plate: string
  digits: string
  note: string | null
  addedBy: string | null
  updatedAt: string
}

class CheckpointDB extends Dexie {
  vehicles!: Table<LocalVehicle>
  pendingLogs!: Table<PendingLog>
  emergencyVehicles!: Table<LocalEmergencyVehicle>

  constructor() {
    super('checkpoint_db')

    this.version(1).stores({
      vehicles: 'id, digits, plate, isExpired, accessType',
      pendingLogs: '++id, synced, timestamp',
    })

    this.version(2).stores({
      vehicles: 'id, digits, plate, isExpired, accessType',
      pendingLogs: '++id, synced, timestamp',
      emergencyVehicles: 'id, digits, plate',
    })
  }
}

// Singleton
export const localDb = new CheckpointDB()

// Пошук за цифрами
export async function searchLocal(query: string): Promise<LocalVehicle[]> {
  if (query.length < 2) return []
  const q = query.toUpperCase()
  const isDigitsOnly = /^\d+$/.test(q)

  if (isDigitsOnly) {
    // Пошук по цифрах номера: "1234" знайде "AA1234BB"
    return localDb.vehicles.filter(v => v.digits.includes(q)).toArray()
  } else {
    // Пошук по повному номеру (іменні + звичайні з літерами)
    return localDb.vehicles.filter(v => v.plate.includes(q)).toArray()
  }
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

// Пошук в аварійному списку
export async function searchEmergency(query: string): Promise<LocalEmergencyVehicle[]> {
  if (query.length < 2) return []
  const q = query.toUpperCase()
  const isDigitsOnly = /^\d+$/.test(q)

  if (isDigitsOnly) {
    return localDb.emergencyVehicles.filter(v => v.digits.includes(q)).toArray()
  } else {
    return localDb.emergencyVehicles.filter(v => v.plate.includes(q)).toArray()
  }
}