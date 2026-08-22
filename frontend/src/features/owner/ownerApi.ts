import apiClient from '@/api/client'
import type { Booking, Car, OwnerDashboardStats, PaginatedResponse } from '@/types'

const OWNER_PAYOUT_RATE = 0.9

function getMonthLabels() {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
  const now = new Date()

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return formatter.format(date)
  })
}

function calculateOwnerPayout(amount: number) {
  return Math.round(amount * OWNER_PAYOUT_RATE)
}

function withOwnerEarnings(stats: Omit<OwnerDashboardStats, 'owner_net_earning'>, bookings: Booking[] = stats.recent_bookings): OwnerDashboardStats {
  const payableBookings = bookings.filter((booking) => booking.status !== 'REQUESTED' && booking.status !== 'BOOKING_REJECTED')
  const ownerEarning = payableBookings.reduce((sum, booking) => sum + calculateOwnerPayout(Number(booking.total_amount || 0)), 0)

  return {
    ...stats,
    total_earnings: ownerEarning,
    owner_net_earning: ownerEarning,
  }
}

export const ownersApi = {
  getDashboard: async (): Promise<OwnerDashboardStats> => {
    const [carsRes, bookingsRes] = await Promise.all([
      apiClient.get<{ data: Car[] }>('/owner/cars'),
      apiClient.get<PaginatedResponse<Booking>>('/owner/bookings'),
    ])

    const cars = carsRes.data.data || []
    const bookings = bookingsRes.data.data || []
    const activeStatuses = new Set(['BOOKING_APPROVED', 'PENDING_ADMIN_APPROVAL'])
    const monthLabels = getMonthLabels()
    const monthlyTotals = new Map(monthLabels.map((month) => [month, 0]))

    bookings.forEach((booking) => {
      if (booking.status === 'BOOKING_REJECTED' || booking.status === 'REQUESTED') return

      const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(booking.created_at))
      if (monthlyTotals.has(month)) {
        monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + calculateOwnerPayout(Number(booking.total_amount || 0)))
      }
    })

    return withOwnerEarnings({
      total_cars: cars.length,
      verified_cars: cars.filter((car) => car.status === 'verified' || car.admin_approval_status === 'APPROVED').length,
      active_rentals: bookings.filter((booking) => activeStatuses.has(String(booking.status))).length,
      pending_bookings: bookings.filter((booking) => booking.status === 'REQUESTED').length,
      total_earnings: 0,
      monthly_earnings: monthLabels.map((month) => ({ month, amount: monthlyTotals.get(month) || 0 })),
      recent_bookings: bookings.slice(0, 5),
    }, bookings)
  },

  getEarnings: async (): Promise<{ total: number; monthly: { month: string; amount: number }[] }> => {
    const res = await apiClient.get<PaginatedResponse<Booking>>('/owner/bookings')
    const bookings = res.data.data || []
    const monthLabels = getMonthLabels()
    const monthlyTotals = new Map(monthLabels.map((month) => [month, 0]))
    let total = 0

    bookings.forEach((booking) => {
      if (booking.status === 'REQUESTED' || booking.status === 'BOOKING_REJECTED') return

      const amount = calculateOwnerPayout(Number(booking.total_amount || 0))
      total += amount

      const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(booking.created_at))
      if (monthlyTotals.has(month)) {
        monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + amount)
      }
    })

    return {
      total,
      monthly: monthLabels.map((month) => ({ month, amount: monthlyTotals.get(month) || 0 })),
    }
  },
}
