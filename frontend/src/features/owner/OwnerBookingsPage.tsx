import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KYCLock } from '@/components/shared/KYCLock'
import { bookingsApi } from '@/api'
import { useToast } from '@/providers'
import type { Booking, User as UserType } from '@/types'
import { formatDate, formatCurrency, bookingRef, driverRef } from '@/utils/format'
import { useCachedFetch, invalidateCache } from '@/hooks/useCachedFetch'
import { Calendar, Car, Eye, Mail, MapPin, SlidersHorizontal, X } from 'lucide-react'

const BOOKING_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'PENDING_ADMIN_APPROVAL', label: 'Admin Review' },
  { value: 'BOOKING_APPROVED', label: 'Approved' },
  { value: 'BOOKING_REJECTED', label: 'Rejected' },
] as const

type BookingFilter = (typeof BOOKING_FILTERS)[number]['value']
type BookingAction = 'accept' | 'reject'

const isBookingFilter = (value: string): value is BookingFilter =>
  BOOKING_FILTERS.some((filter) => filter.value === value)

export function OwnerBookingsPage() {
  return (
    <KYCLock feature="Bookings">
      <OwnerBookingsContent />
    </KYCLock>
  )
}

function OwnerBookingsContent() {
  const { addToast } = useToast()
  const { data: bookings = [], isLoading: loading, refresh } = useCachedFetch<Booking[]>('owner-bookings', () => bookingsApi.getOwnerBookings().then((res) => res.data))
  const [activeTab, setActiveTab] = useState<BookingFilter>('all')
  const [actionId, setActionId] = useState<string | number | null>(null)
  const [actionType, setActionType] = useState<BookingAction | null>(null)
  const [driverDetailBooking, setDriverDetailBooking] = useState<Booking | null>(null)
  const [processing, setProcessing] = useState(false)

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings
    return bookings.filter((booking) => booking.status === activeTab)
  }, [activeTab, bookings])

  const handleTabChange = useCallback((value: string) => {
    if (isBookingFilter(value)) setActiveTab(value)
  }, [])

  const handleRequestAction = useCallback((id: string | number, type: BookingAction) => {
    setActionId(id)
    setActionType(type)
  }, [])

  const handleViewDriver = useCallback((booking: Booking) => {
    setDriverDetailBooking(booking)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setActionId(null)
    setActionType(null)
  }, [])

  const handleAction = useCallback(async () => {
    if (!actionId) return
    try {
      setProcessing(true)
      if (actionType === 'accept') {
        await bookingsApi.acceptBooking(actionId)
        addToast('Booking accepted — waiting for admin approval', 'success')
      } else {
        await bookingsApi.rejectBooking(actionId, 'Rejected by owner')
        addToast('Booking rejected', 'info')
      }
      handleCloseDialog()
      invalidateCache('owner-bookings')
      refresh()
    } catch {
      addToast('Action failed', 'error')
    } finally {
      setProcessing(false)
    }
  }, [actionId, actionType, addToast, handleCloseDialog, refresh])

  const handleSendAgreement = useCallback(async (booking: Booking) => {
    try {
      setProcessing(true)
      await bookingsApi.sendOwnerAgreement(booking.id)
      addToast('Agreement sent — commission payment is required before it unlocks', 'success')
      invalidateCache('owner-bookings')
      refresh()
    } catch (error) {
      const message = (
        error as { response?: { data?: { error?: string } } }
      )?.response?.data?.error
      addToast(message || 'Failed to send agreement', 'error')
    } finally {
      setProcessing(false)
    }
  }, [addToast, refresh])

  if (loading) return <LoadingSkeleton type="list" count={4} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Booking Requests</h1>
        <p className="text-sm text-muted-foreground">Review driver booking requests and track payment status.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <BookingFilterTabs />

        <TabsContent value={activeTab} className="mt-4">
          {filteredBookings.length === 0 ? (
            <EmptyState title="No bookings" description="You will see booking requests here" />
          ) : (
            <BookingList
              bookings={filteredBookings}
              onRequestAction={handleRequestAction}
              onViewDriver={handleViewDriver}
              onSendAgreement={handleSendAgreement}
              processing={processing}
            />
          )}
        </TabsContent>
      </Tabs>

      <DriverDetailDialog booking={driverDetailBooking} onOpenChange={(open) => !open && setDriverDetailBooking(null)} />

      <ConfirmDialog
        open={!!actionId}
        onOpenChange={handleCloseDialog}
        title={actionType === 'accept' ? 'Accept Booking' : 'Reject Booking'}
        description={actionType === 'accept' ? 'Confirm this booking request?' : 'Reject this booking request?'}
        variant={actionType === 'accept' ? 'default' : 'destructive'}
        confirmLabel={actionType === 'accept' ? 'Accept' : 'Reject'}
        onConfirm={handleAction}
        loading={processing}
      />
    </div>
  )
}

const BookingFilterTabs = memo(function BookingFilterTabs() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        Filter bookings
      </div>
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
        {BOOKING_FILTERS.map((filter) => (
          <TabsTrigger
            key={filter.value}
            value={filter.value}
            className="rounded-md px-3 py-2 text-xs font-semibold text-slate-500 data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )
})

const BookingList = memo(function BookingList({
  bookings,
  onRequestAction,
  onViewDriver,
  onSendAgreement,
  processing,
}: {
  bookings: Booking[]
  onRequestAction: (id: string | number, type: BookingAction) => void
  onViewDriver: (booking: Booking) => void
  onSendAgreement: (booking: Booking) => void
  processing: boolean
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bookings.map((booking) => (
        <BookingRequestCard
          key={booking.id}
          booking={booking}
          onRequestAction={onRequestAction}
          onViewDriver={onViewDriver}
          onSendAgreement={onSendAgreement}
          processing={processing}
        />
      ))}
    </div>
  )
})

const BookingRequestCard = memo(function BookingRequestCard({
  booking,
  onRequestAction,
  onViewDriver,
  onSendAgreement,
  processing,
}: {
  booking: Booking
  onRequestAction: (id: string | number, type: BookingAction) => void
  onViewDriver: (booking: Booking) => void
  onSendAgreement: (booking: Booking) => void
  processing: boolean
}) {
  const paymentStatus = booking.owner_payment_status || booking.owner_payment?.status || 'incomplete'
  const driverName = booking.driver?.name || `Driver #${booking.driver_id}`

  const handleAccept = useCallback(() => {
    onRequestAction(booking.id, 'accept')
  }, [booking.id, onRequestAction])

  const handleReject = useCallback(() => {
    onRequestAction(booking.id, 'reject')
  }, [booking.id, onRequestAction])

  const handleViewDriver = useCallback(() => {
    onViewDriver(booking)
  }, [booking, onViewDriver])

  const handleSendAgreement = useCallback(() => {
    onSendAgreement(booking)
  }, [booking, onSendAgreement])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full">
      <Card className="flex h-full overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-md">
        <CardContent className="flex w-full flex-col p-0">
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start gap-3">
              <button type="button" onClick={handleViewDriver} className="shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80">
                <DriverAvatar driver={booking.driver} name={driverName} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{driverName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {bookingRef(booking.id)} · {formatDate(booking.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={booking.status} type="booking" />
                  <StatusBadge status={paymentStatus} type="payment" />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-slate-500">
                  <Car className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {booking.car ? `${booking.car.brand} ${booking.car.model}` : `Car #${booking.car_id}`}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-slate-950">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="h-4 w-4 shrink-0" />
                {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
              </div>
            </div>

            {booking.driver_notes && (
              <p className="mt-3 line-clamp-2 text-xs text-slate-500">{booking.driver_notes}</p>
            )}
          </div>

          <div className="mt-auto border-t border-slate-200 bg-slate-50 px-4 py-3">
            {booking.status === 'REQUESTED' ? (
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" onClick={handleViewDriver}>Info</Button>
                <Button size="sm" variant="success" onClick={handleAccept}>Accept</Button>
                <Button size="sm" variant="destructive" onClick={handleReject}>Reject</Button>
              </div>
            ) : booking.status === 'PENDING_ADMIN_APPROVAL' ? (
              <Button size="sm" variant="outline" disabled className="w-full">
                Waiting for admin approval
              </Button>
            ) : booking.status === 'BOOKING_APPROVED' && !booking.agreement_sent_at ? (
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={handleViewDriver}>Info</Button>
                <Button size="sm" onClick={handleSendAgreement} disabled={processing}>Send Agreement</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleViewDriver} className="w-full">
                <Eye className="h-4 w-4" /> Driver info
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
})

function DriverDetailDialog({
  booking,
  onOpenChange,
}: {
  booking: Booking | null
  onOpenChange: (open: boolean) => void
}) {
  const driver = booking?.driver
  const driverName = driver?.name || (booking ? `Driver #${booking.driver_id}` : 'Driver')
  const fallback = driverName.trim().charAt(0).toUpperCase() || 'D'

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-hidden border-slate-200 bg-white p-0 shadow-2xl shadow-slate-950/20 sm:max-w-2xl">
        <DialogClose className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80">
          <X className="h-4 w-4" />
        </DialogClose>
        <DialogHeader className="border-b border-slate-200 bg-slate-50 px-5 py-4 pr-12">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
              {driver?.profile_photo_url ? (
                <img src={driver.profile_photo_url} alt={driverName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold">{fallback}</span>
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl text-slate-950">{driverName}</DialogTitle>
              <DialogDescription className="mt-1 text-slate-500">
                {booking ? `Driver · ${driverRef(booking.driver_id)}` : 'Driver information'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {booking && (
          <div className="max-h-[calc(92vh-88px)] space-y-5 overflow-y-auto bg-slate-50/70 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <DriverDetailItem icon={<Mail className="h-4 w-4" />} label="Email" value={driver?.email || 'Not provided'} />
              <DriverDetailItem icon={<MapPin className="h-4 w-4" />} label="City" value={driver?.city || 'Not provided'} />
              <DriverDetailItem icon={<MapPin className="h-4 w-4" />} label="Township" value={driver?.township || 'Not provided'} />
              <DriverDetailItem icon={<Calendar className="h-4 w-4" />} label="Joined" value={driver?.created_at ? formatDate(driver.created_at) : 'Unknown'} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Applied car</p>
              {booking.car ? (
                <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-950">{booking.car.brand} {booking.car.model}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">{booking.car.license_plate}</span>
                    <span className="shrink-0">{booking.car.year} · {booking.car.color}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                    <span className="text-slate-500">Daily rate</span>
                    <span className="font-semibold text-slate-950">
                      {formatCurrency(booking.car.daily_rate || booking.car.rental_price || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500">
                  No car information
                </p>
              )}
            </div>

            {(booking.driver_notes || booking.rejection_reason) && (
              <div className="space-y-3">
                {booking.driver_notes && (
                  <DriverNote label="Driver notes" value={booking.driver_notes} />
                )}
                {booking.rejection_reason && (
                  <DriverNote label="Rejection reason" value={booking.rejection_reason} />
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DriverAvatar({ driver, name }: { driver?: UserType; name: string }) {
  const fallback = name.trim().charAt(0).toUpperCase() || 'D'

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
      {driver?.profile_photo_url ? (
        <img src={driver.profile_photo_url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-base font-semibold">{fallback}</span>
      )}
    </div>
  )
}

function DriverDetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  )
}

function DriverNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-700">{value}</p>
    </div>
  )
}
