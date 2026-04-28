import Dexie, { type Table } from 'dexie'

export interface LocalVehicle {
  id: number
  plate: string
  digits: string
  company: string
  projectId?: number | null
  projectName?: string | null
  projectActive?: boolean | null
  contactName: string | null
  contactPhone: string | null
  accessType: 'PERMANENT' | 'TEMPORARY' | 'SINGLE_USE'
  expiresAt: string | null
  isExpired: boolean
  note: string | null
  updatedAt: string
}

export interface PendingLog {
  id?: number
  plate: string
  vehicleId: number | null
  result: 'ALLOWED' | 'DENIED' | 'UNKNOWN'
  operatorId: string | null
  note: string | null
  timestamp: string
  synced: number
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

    // version 3: додали projectName, projectActive
    // Очищаємо vehicles щоб наступний sync завантажив нові поля
    this.version(3).stores({
      vehicles: 'id, digits, plate, isExpired, accessType, projectId',
      pendingLogs: '++id, synced, timestamp',
      emergencyVehicles: 'id, digits, plate',
    }).upgrade(tx => tx.table('vehicles').clear())
  }
}

export const localDb = new CheckpointDB()

export async function searchLocal(query: string): Promise<LocalVehicle[]> {
  if (query.length < 2) return []
  const q = query.toUpperCase()
  const isDigitsOnly = /^\d+$/.test(q)
  if (isDigitsOnly) {
    return localDb.vehicles.filter(v => v.digits.includes(q)).toArray()
  } else {
    return localDb.vehicles.filter(v => v.plate.includes(q)).toArray()
  }
}

export async function savePendingLog(
  log: Omit<PendingLog, 'id' | 'synced'>
): Promise<void> {
  await localDb.pendingLogs.add({ ...log, synced: 0 })
}

export async function getPendingLogs(): Promise<PendingLog[]> {
  return localDb.pendingLogs.where('synced').equals(0).toArray()
}

export async function markLogsSynced(ids: number[]): Promise<void> {
  await localDb.pendingLogs.where('id').anyOf(ids).modify({ synced: 1 })
}

export async function getPendingCount(): Promise<number> {
  return localDb.pendingLogs.where('synced').equals(0).count()
}

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