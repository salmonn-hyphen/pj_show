import apiClient from '@/api/client'
import type { DriverDashboardStats } from '@/types'

export const driversApi = {
  getDashboard: async (): Promise<DriverDashboardStats> => {
    await new Promise(resolve => setTimeout(resolve, 600))

    return {
      active_bookings: 1,
      completed_bookings: 14,
      pending_bookings: 0,
      deposit_status: 'released',
      verification_progress: 100,
      recent_bookings: [
        {
          id: 201,
          car_id: 2,
          driver_id: 4,
          owner_id: 3,
          start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 180000,
          status: 'BOOKING_APPROVED',
          driver_notes: null,
          owner_notes: null,
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          car: {
            id: 2,
            owner_id: 3,
            brand: 'Toyota',
            model: 'Belta',
            year: 2010,
            color: 'Black',
            license_plate: 'YGN-3C-9988',
            seat_capacity: 5,
            fuel_type: 'cng',
            car_type: 'sedan',
            transmission: 'Automatic',
            mileage: 150000,
            daily_rate: 30000,
            weekly_rate: 180000,
            monthly_rate: null,
            deposit_amount: 50000,
            location: 'Insein',
            city: 'Yangon',
            description: 'Good condition',
            features: ['AC'],
            status: 'verified',
            is_available: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        }
      ] as any,
      recommended_cars: [
        {
          id: 3,
          owner_id: 5,
          brand: 'Suzuki',
          model: 'Ertiga',
          year: 2019,
          color: 'White',
          license_plate: 'YGN-5E-1122',
          seat_capacity: 7,
          fuel_type: 'petrol',
          car_type: 'mpv',
          transmission: 'Automatic',
          mileage: 45000,
          daily_rate: 55000,
          weekly_rate: 350000,
          monthly_rate: 1200000,
          deposit_amount: 100000,
          location: 'Tamwe',
          city: 'Yangon',
          description: 'Spacious 7 seater, great for family or groups',
          features: ['AC', 'Bluetooth', 'Reverse Camera', '3rd Row Seats'],
          status: 'verified',
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ] as any
    }
  },
}
