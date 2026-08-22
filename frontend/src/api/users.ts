import apiClient from './client'
import type { User, OwnerProfile, DriverProfile, OwnerDocument, DriverDocument, ApiResponse } from '@/types'

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get('/user/profile')
    return res.data.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.put('/user/profile', data)
    return res.data.data
  },

  updateDriverUserProfile: async (data: any): Promise<User> => {
    const res = await apiClient.put('/driver/profile', data)
    return res.data.data
  },

  uploadKycDocuments: async (formData: FormData): Promise<any> => {
    const res = await apiClient.post('/driver/kyc/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  getKycStatus: async (): Promise<any> => {
    const res = await apiClient.get('/driver/kyc')
    return res.data.data
  },

  getOwnerProfile: async (): Promise<OwnerProfile> => {
    const res = await apiClient.get('/owner/profile')
    return res.data.data
  },

  updateOwnerProfile: async (data: Partial<OwnerProfile>): Promise<OwnerProfile> => {
    const res = await apiClient.put('/owner/profile', data)
    return res.data.data
  },

  getDriverProfile: async (): Promise<DriverProfile> => {
    const res = await apiClient.get('/driver/profile')
    return res.data.data
  },

  updateDriverProfile: async (data: Partial<DriverProfile>): Promise<DriverProfile> => {
    const res = await apiClient.put('/driver/profile', data)
    return res.data.data
  },

  uploadOwnerDocument: async (type: string, file: File): Promise<OwnerDocument> => {
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

    const res = await apiClient.post('/owner/documents', {
      type,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fileData,
    })
    return res.data.data
  },

  getOwnerDocuments: async (): Promise<OwnerDocument[]> => {
    const res = await apiClient.get('/owner/documents')
    return res.data.data
  },

  uploadDriverDocument: async (type: string, file: File): Promise<DriverDocument> => {
    const formData = new FormData()
    formData.append('type', type)
    formData.append('file', file)
    const res = await apiClient.post('/driver/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  getDriverDocuments: async (): Promise<DriverDocument[]> => {
    const res = await apiClient.get('/driver/documents')
    return res.data.data
  },

  uploadProfilePhoto: async (file: File): Promise<User> => {
    const formData = new FormData()
    formData.append('photo', file)
    const res = await apiClient.post('/user/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await apiClient.post('/user/change-password', data)
  },
}
