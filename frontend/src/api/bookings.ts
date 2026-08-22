import apiClient from './client'
import type { Booking, PaginatedResponse } from '@/types'

export const bookingsApi = {
  create: async (carId: string | number, data: { start_date?: string; end_date?: string; driver_notes?: string } = {}): Promise<Booking> => {
    const res = await apiClient.post(`/driver/bookings`, { car_id: carId, ...data })
    return res.data.data
  },

  getMyBookings: async (params?: { page?: number; status?: string }): Promise<PaginatedResponse<Booking>> => {
    const res = await apiClient.get('/driver/bookings', { params })
    return res.data
  },

  getDriverBooking: async (id: string | number): Promise<Booking> => {
    const res = await apiClient.get(`/driver/bookings/${id}`)
    return res.data.data
  },

  getOwnerBookings: async (params?: { page?: number; status?: string }): Promise<PaginatedResponse<Booking>> => {
    const res = await apiClient.get('/owner/bookings', { params })
    return res.data
  },

  getOwnerBooking: async (id: string | number): Promise<Booking> => {
    const res = await apiClient.get(`/owner/bookings/${id}`)
    return res.data.data
  },

  acceptBooking: async (id: string | number): Promise<Booking> => {
    const res = await apiClient.post(`/owner/bookings/${id}/accept`)
    return res.data.data
  },

  rejectBooking: async (id: string | number, reason: string): Promise<Booking> => {
    const res = await apiClient.post(`/owner/bookings/${id}/reject`, { reason })
    return res.data.data
  },

  adminAcceptBooking: async (id: string | number): Promise<Booking> => {
    const res = await apiClient.post(`/admin/bookings/${id}/accept`)
    return res.data.data
  },

  adminRejectBooking: async (id: string | number, reason?: string): Promise<Booking> => {
    const res = await apiClient.post(`/admin/bookings/${id}/reject`, { reason })
    return res.data.data
  },

  sendAgreement: async (id: string | number): Promise<Booking> => {
    const res = await apiClient.post(`/admin/bookings/${id}/send-agreement`)
    return res.data.data
  },

  sendOwnerAgreement: async (id: string | number): Promise<Booking> => {
    const res = await apiClient.post(`/owner/bookings/${id}/send-agreement`)
    return res.data.data
  },

  cancelBooking: async (id: string | number, reason?: string): Promise<Booking> => {
    const res = await apiClient.post(`/bookings/${id}/cancel`, { reason })
    return res.data.data
  },

  completeBooking: async (id: string | number): Promise<Booking> => {
    const res = await apiClient.post(`/owner/bookings/${id}/complete`)
    return res.data.data
  },

  getAll: async (params?: { page?: number; status?: string }): Promise<PaginatedResponse<Booking>> => {
    const res = await apiClient.get('/admin/bookings', { params })
    return res.data
  },
}
