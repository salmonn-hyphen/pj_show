import { Badge } from '@/components/ui/badge'
import {
  VERIFICATION_LABELS, VERIFICATION_COLORS,
  BOOKING_LABELS, BOOKING_COLORS,
  AGREEMENT_LABELS, AGREEMENT_COLORS,
} from '@/constants'

interface StatusBadgeProps {
  status: string
  type?: 'verification' | 'booking' | 'payment' | 'dispute' | 'document' | 'deposit' | 'agreement'
}

const PAYMENT_LABELS: Record<string, string> = {
  incomplete: 'Payment Required',
  PENDING_PAYMENT_VERIFICATION: 'Pending Verification',
  PAYMENT_VERIFIED: 'Verified',
  PAYMENT_REJECTED: 'Rejected',
}

const PAYMENT_COLORS: Record<string, string> = {
  incomplete: 'bg-gray-100 text-gray-700',
  PENDING_PAYMENT_VERIFICATION: 'bg-blue-100 text-blue-700',
  PAYMENT_VERIFIED: 'bg-green-100 text-green-700',
  PAYMENT_REJECTED: 'bg-red-100 text-red-700',
}

const AGREEMENT_LOCAL_COLORS: Record<string, string> = {
  ...AGREEMENT_COLORS,
}

const DISPUTE_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  closed: 'Closed',
}

const DISPUTE_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

const DOCUMENT_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  not_uploaded: 'Not Uploaded',
}

const DOCUMENT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  not_uploaded: 'bg-gray-100 text-gray-700',
}

const DEPOSIT_LABELS: Record<string, string> = {
  incomplete: 'Incomplete',
  held: 'Held',
  frozen: 'Frozen',
  released: 'Released',
  deducted: 'Deducted',
}

const DEPOSIT_COLORS: Record<string, string> = {
  incomplete: 'bg-gray-100 text-gray-700',
  held: 'bg-blue-100 text-blue-700',
  frozen: 'bg-red-100 text-red-700',
  released: 'bg-green-100 text-green-700',
  deducted: 'bg-purple-100 text-purple-700',
}

function getLabel(status: string, type: string): string {
  switch (type) {
    case 'verification': return VERIFICATION_LABELS[status] || status
    case 'booking': return BOOKING_LABELS[status] || status
    case 'payment': return PAYMENT_LABELS[status] || status
    case 'agreement': return AGREEMENT_LABELS[status] || status
    case 'dispute': return DISPUTE_LABELS[status] || status
    case 'document': return DOCUMENT_LABELS[status] || status
    case 'deposit': return DEPOSIT_LABELS[status] || status
    default: return status
  }
}

function getColor(status: string, type: string): string {
  switch (type) {
    case 'verification': return VERIFICATION_COLORS[status] || ''
    case 'booking': return BOOKING_COLORS[status] || ''
    case 'payment': return PAYMENT_COLORS[status] || ''
    case 'agreement': return AGREEMENT_LOCAL_COLORS[status] || ''
    case 'dispute': return DISPUTE_COLORS[status] || ''
    case 'document': return DOCUMENT_COLORS[status] || ''
    case 'deposit': return DEPOSIT_COLORS[status] || ''
    default: return ''
  }
}

export function StatusBadge({ status, type = 'verification' }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${getColor(status, type)} border-0 font-medium`}>
      {getLabel(status, type)}
    </Badge>
  )
}
