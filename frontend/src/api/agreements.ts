import apiClient from './client'
import type { AgreementStatus, Booking, PaymentStatus } from '@/types'

export interface Agreement extends Booking {
  agreement_sent_at: string | null
  owner_agreement_agreed_at: string | null
  driver_agreement_agreed_at: string | null
  agreement_status?: AgreementStatus | null
  commission_payment_status?: PaymentStatus | null
  is_agreement_locked?: boolean
}

export const AGREEMENT_LOCKED_MESSAGE =
  'Commission payment is required before viewing this agreement.'

export const agreementsApi = {
  list: async (): Promise<Agreement[]> => {
    const res = await apiClient.get('/agreements')
    return res.data.data
  },
}
