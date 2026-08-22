import { memo, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuth } from '@/providers'
import { bookingsApi, usersApi } from '@/api'
import type { Booking } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import { ArrowRight, Calendar, Car, CheckCircle2, Clock3, Eye, Loader2, ShieldAlert, User, Wallet, XCircle } from 'lucide-react'

function canCancelDriverBooking(booking: Booking) {
  const paymentStatus = booking.payment_status || booking.payment?.status || 'incomplete'
  const paymentSuccessful =
    paymentStatus === 'PAYMENT_VERIFIED' || !!booking.payment?.confirmed_at || !!booking.payment?.paid_at

  return ['REQUESTED', 'PENDING_ADMIN_APPROVAL'].includes(booking.status) && !paymentSuccessful
}

export function DriverBookingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [kycStatus, setKycStatus] = useState<string>('PENDING')
  const [loadingKyc, setLoadingKyc] = useState(true)

  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const kycData = await usersApi.getKycStatus()
        setKycStatus(kycData?.kycStatus || 'PENDING')
      } catch (err) {
        // Fallback to checking the user session's verification_status
        if (user?.verification_status === 'verified' || user?.verification_status === 'trusted') {
          setKycStatus('APPROVED')
        } else {
          setKycStatus('PENDING')
        }
      } finally {
        setLoadingKyc(false)
      }
    }

    if (user) {
      fetchKycStatus()
    }
  }, [user])

  useEffect(() => {
    if (kycStatus === 'APPROVED') {
      loadBookings()
    }
  }, [kycStatus])

  const loadBookings = async () => {
    try {
      setLoadingBookings(true)
      const res = await bookingsApi.getMyBookings()
      setBookings(res.data)
    } catch {
      setBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  const handleCancel = async () => {
    if (cancelBooking && canCancelDriverBooking(cancelBooking)) {
      await bookingsApi.cancelBooking(cancelBooking.id)
      setCancelBooking(null)
      loadBookings()
    }
  }

  const bookingStats = useMemo(() => {
    const active = bookings.filter((booking) => ['BOOKING_APPROVED', 'PENDING_ADMIN_APPROVAL'].includes(booking.status)).length
    const pending = bookings.filter((booking) => booking.status === 'REQUESTED').length
    const completed = bookings.filter(
      (booking) => booking.agreement_status === 'ACTIVE' || (!!booking.owner_agreement_agreed_at && !!booking.driver_agreement_agreed_at),
    ).length

    return { active, pending, completed }
  }, [bookings])

  const visibleBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings
    if (statusFilter === 'active') {
      return bookings.filter((booking) => ['BOOKING_APPROVED', 'PENDING_ADMIN_APPROVAL'].includes(booking.status))
    }

    return bookings.filter((booking) => booking.status === statusFilter)
  }, [bookings, statusFilter])

  if (loadingKyc) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center shadow-sm">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-amber-600" />
        <p className="text-sm text-slate-500">Checking verification status...</p>
      </div>
    )
  }

  if (kycStatus !== 'APPROVED') {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="p-6 text-center sm:p-8">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-red-200 bg-red-50">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-950">KYC Verification Required</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Please complete your identity verification to access My Booking and manage rental requests.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => navigate('/driver')}>
                Back to Dashboard
              </Button>
              <Button onClick={() => navigate('/driver/documents')} className="gap-2 px-6">
                Go to KYC <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">



      {loadingBookings ? (
        <LoadingSkeleton type="list" count={4} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings"
          description="Browse cars to make a booking."
          action={<Button size="sm" onClick={() => navigate('/driver/cars')}>Browse Cars</Button>}
        />
      ) : visibleBookings.length === 0 ? (
        <EmptyState
          title="No matching bookings"
          description="Try another status filter to see more bookings."
          action={<Button size="sm" variant="outline" onClick={() => setStatusFilter('all')}>Show All</Button>}
        />
      ) : (
        <DriverBookingList bookings={visibleBookings} onCancel={setCancelBooking} onView={(id) => navigate(`/driver/bookings/${id}`)} />
      )}

      <ConfirmDialog
        open={cancelBooking !== null}
        onOpenChange={(open) => !open && setCancelBooking(null)}
        title="Cancel Booking?"
        description="This action cannot be undone. The booking will be cancelled immediately."
        variant="destructive"
        confirmLabel="Yes, Cancel"
        onConfirm={handleCancel}
      />
    </div>
  )
}

function BookingSummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}

const DriverBookingList = memo(function DriverBookingList({
  bookings,
  onCancel,
  onView,
}: {
  bookings: Booking[]
  onCancel: (booking: Booking) => void
  onView: (id: string | number) => void
}) {
  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <DriverBookingCard key={booking.id} booking={booking} onCancel={onCancel} onView={onView} />
      ))}
    </div>
  )
})

const DriverBookingCard = memo(function DriverBookingCard({
  booking,
  onCancel,
  onView,
}: {
  booking: Booking
  onCancel: (booking: Booking) => void
  onView: (id: string | number) => void
}) {
  const carName = booking.car ? `${booking.car.brand} ${booking.car.model}` : `Car #${booking.car_id}`
  const ownerName = booking.owner?.name || `Owner #${booking.owner_id}`
  const paymentStatus = booking.payment_status || booking.payment?.status || 'incomplete'
  const canCancel = canCancelDriverBooking(booking)

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-lg">
        <CardContent className="p-0">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-base font-semibold text-slate-950">{carName}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Requested {formatDate(booking.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{bookingRef(booking.id)}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                    </span>
                    <span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <User className="h-4 w-4 text-slate-500" />
                      {ownerName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 lg:min-w-44 lg:text-right">
                <p className="text-xs font-medium uppercase text-emerald-700">Total amount</p>
                <p className="mt-1 text-xl font-semibold text-emerald-950">{formatCurrency(booking.total_amount)}</p>
              </div>
            </div>

            {booking.driver_notes && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {booking.driver_notes}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={booking.status} type="booking" />
              <StatusBadge status={paymentStatus} type="payment" />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => onView(booking.id)}>
                <Eye className="h-4 w-4" />
                Details
              </Button>
              {canCancel && (
                <Button size="sm" variant="destructive" onClick={() => onCancel(booking)}>
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})
