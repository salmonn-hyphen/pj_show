import apiClient from './client'
import type { Car, CarPhoto, CarDocument, PaginatedResponse } from '@/types'

export interface CarFilters {
  location?: string
  city?: string
  min_price?: number
  max_price?: number
  car_type?: string
  fuel_type?: string
  verified_only?: boolean
  page?: number
  per_page?: number
}

export const carsApi = {
  list: async (filters?: CarFilters): Promise<PaginatedResponse<Car>> => {
    const res = await apiClient.get('/cars', { params: filters })
    if (res.data?.meta) {
      return {
        data: res.data.data,
        current_page: res.data.meta.current_page,
        last_page: res.data.meta.last_page,
        per_page: res.data.meta.per_page,
        total: res.data.meta.total,
      }
    }
    return res.data
  },

  getById: async (id: string | number): Promise<Car> => {
    const res = await apiClient.get(`/cars/${id}`)
    return res.data.data
  },

  create: async (data: Record<string, unknown>): Promise<Car> => {
    const res = await apiClient.post('/owner/cars', data)
    return res.data.data
  },

  update: async (id: string | number, data: Record<string, unknown>): Promise<Car> => {
    const res = await apiClient.put(`/owner/cars/${id}`, data)
    return res.data.data
  },

  delete: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/owner/cars/${id}`)
  },

  getOwnerCars: async (): Promise<Car[]> => {
    const res = await apiClient.get('/owner/cars')
    return res.data.data
  },

  getOwnerCar: async (id: string | number): Promise<Car> => {
    const res = await apiClient.get(`/owner/cars/${id}`)
    return res.data.data
  },

  uploadPhoto: async (carId: number, file: File, isPrimary?: boolean): Promise<CarPhoto> => {
    const formData = new FormData()
    formData.append('photo', file)
    if (isPrimary) formData.append('is_primary', '1')
    const res = await apiClient.post(`/owner/cars/${carId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  deletePhoto: async (carId: number, photoId: number): Promise<void> => {
    await apiClient.delete(`/owner/cars/${carId}/photos/${photoId}`)
  },

  getDocuments: async (carId: number): Promise<CarDocument[]> => {
    const res = await apiClient.get(`/cars/${carId}/documents`)
    return res.data.data
  },

  uploadDocument: async (carId: number, type: string, file: File): Promise<CarDocument> => {
    const formData = new FormData()
    formData.append('type', type)
    formData.append('file', file)
    const res = await apiClient.post(`/owner/cars/${carId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  toggleAvailability: async (id: string | number): Promise<Car> => {
    const res = await apiClient.post(`/owner/cars/${id}/toggle-availability`)
    return res.data.data
  },
}
