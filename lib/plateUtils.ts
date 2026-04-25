// Витягує тільки цифри з номера: "AA1234BB" → "1234"
export function extractDigits(plate: string): string {
  return plate.replace(/\D/g, '')
}

// Нормалізація номера: прибирає пробіли, переводить у верхній регістр
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, '').trim()
}

// ✅ ВИПРАВЛЕНО: повертає 'expired' для прострочених (раніше було 'denied')
export function getVehicleStatus(vehicle: {
  accessType: string
  expiresAt: Date | string | null
  isExpired: boolean
}): 'allowed' | 'expired' | 'denied' {
  if (vehicle.accessType === 'PERMANENT') return 'allowed'
  if (vehicle.accessType === 'SINGLE_USE') {
    return vehicle.isExpired ? 'denied' : 'allowed'
  }
  if (vehicle.isExpired) return 'expired'

  if (!vehicle.expiresAt) return 'denied'

  const expires =
    vehicle.expiresAt instanceof Date
      ? vehicle.expiresAt
      : new Date(vehicle.expiresAt)

  return expires > new Date() ? 'allowed' : 'expired'
}

// Повертає кількість днів до закінчення або null
export function getDaysLeft(expiresAt: Date | string | null): number | null {
  if (!expiresAt) return null
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Повертає скільки днів тому прострочено
export function getDaysOverdue(expiresAt: Date | string | null): number | null {
  if (!expiresAt) return null
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  const diff = Date.now() - date.getTime()
  if (diff <= 0) return null
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
