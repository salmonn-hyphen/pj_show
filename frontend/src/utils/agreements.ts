import type { Agreement } from '@/api/agreements'

export function agreementPath(role: string | undefined, id: string | number) {
  const normalizedRole = role?.toUpperCase()
  if (normalizedRole === 'OWNER') return `/owner/agreements/${id}`
  if (normalizedRole === 'DRIVER') return `/driver/agreements/${id}`
  return `/admin/agreements/${id}`
}

export function parseRentalMonths(value?: string | null) {
  if (!value) return null
  const match = String(value).match(/\d+/)
  return match ? Number(match[0]) : null
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export function getAgreementExpireDate(agreement: Agreement) {
  const startDate = agreement.created_at ? new Date(agreement.created_at) : new Date()
  const rentalMonths = parseRentalMonths(agreement.car?.rental_period)

  if (rentalMonths) return addMonths(startDate, rentalMonths)
  if (agreement.end_date) return new Date(agreement.end_date)
  return null
}