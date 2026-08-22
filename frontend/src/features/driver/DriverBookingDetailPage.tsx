import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Car, DollarSign, Mail, Phone, Shield, Star, User, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FileUploader } from '@/components/shared/FileUploader'
import { PAYMENT_METHODS } from '@/constants'
import { bookingsApi, paymentsApi, depositsApi } from '@/api'
import { useToast } from '@/providers'
import type { Booking } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'

function canCancelDriverBooking(booking: Booking) {
  const paymentStatus = booking.payment_status || booking.payment?.status || 'incomplete'
  const paymentSuccessful =
    paymentStatus === 'PAYMENT_VERIFIED' || !!booking.payment?.confirmed_at || !!booking.payment?.paid_at

  return ['REQUESTED', 'PENDING_ADMIN_APPROVAL'].includes(booking.status) && !paymentSuccessful
}

export function DriverBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('kbzpay')

  const availablePaymentMethods = PAYMENT_METHODS.filter((method) =>
    ['kbzpay', 'wavepay', 'ayapay'].includes(method.value),
  )

  const selectedPaymentMethod = availablePaymentMethods.find((method) => method.value === paymentMethod) || availablePaymentMethods[0]
  const agencyPaymentDetails: Record<string, { accountName: string; accountNumber: string; qrImage: string }> = {
    kbzpay: {
      accountName: 'Taxi Meik Swe Agency',
      accountNumber: '09 000 111 222',
      qrImage: createQrPlaceholder('KBZPAY', '09 000 111 222'),
    },
    wavepay: {
      accountName: 'Taxi Meik Swe Agency',
      accountNumber: '09 000 333 444',
      qrImage: createQrPlaceholder('WAVEPAY', '09 000 333 444'),
    },
    ayapay: {
      accountName: 'Taxi Meik Swe Agency',
      accountNumber: '09 000 555 666',
      qrImage: createQrPlaceholder('AYAPAY', '09 000 555 666'),
    },
  }
  const selectedAgencyPayment = agencyPaymentDetails[selectedPaymentMethod?.value || 'kbzpay']

  useEffect(() => {
    if (id) loadBooking(id)
  }, [id])

  const loadBooking = async (bookingId: string | number) => {
    try {
      const data = await bookingsApi.getDriverBooking(bookingId)
      setBooking(data)
    } catch {
      navigate('/driver/bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!booking) return
    try {
      await bookingsApi.cancelBooking(booking.id)
      addToast('Booking cancelled', 'success')
      loadBooking(booking.id)
      setCancelOpen(false)
    } catch {
      addToast('Failed to cancel', 'error')
    }
  }

  const handlePaymentUpload = async (file: File) => {
    if (!booking) return
    try {
      const formData = new FormData()
      formData.append('method', paymentMethod)
      formData.append('screenshot', file)
      await paymentsApi.submitPayment(booking.id, formData)
      addToast('Payment submitted for review', 'success')
      setShowPaymentForm(false)
      loadBooking(booking.id)
    } catch {
      addToast('Payment upload failed', 'error')
    }
  }

  const handleDepositUpload = async (file: File) => {
    if (!booking) return
    try {
      const formData = new FormData()
      formData.append('payment_method', paymentMethod)
      formData.append('screenshot', file)
      await depositsApi.submitDeposit(booking.id, formData)
      addToast('Deposit submitted', 'success')
      setShowDepositForm(false)
      loadBooking(booking.id)
    } catch {
      addToast('Deposit upload failed', 'error')
    }
  }

  if (loading) return <LoadingSkeleton type="detail" />
  if (!booking) return null

  const paymentStatus = booking.payment_status || booking.payment?.status || 'incomplete'
  const depositStatus = booking.deposit_status || booking.deposit?.status || 'incomplete'
  const agreementComplete = !!booking.owner_agreement_agreed_at && !!booking.driver_agreement_agreed_at
  const agreementSent = !!booking.agreement_sent_at
  // New flow: commission payment happens BEFORE the agreement is unlocked and signed
  const canSubmitPayment =
    booking.status === 'BOOKING_APPROVED' &&
    agreementSent &&
    ['incomplete', 'PAYMENT_REJECTED'].includes(paymentStatus)
  const canCancel = canCancelDriverBooking(booking)

  const carName = booking.car ? `${booking.car.brand} ${booking.car.model}` : `Car #${booking.car_id}`
  const ownerName = booking.owner?.name || `Owner #${booking.owner_id}`

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold text-slate-950">{bookingRef(booking.id)}</h1>
                      <StatusBadge status={booking.status} type="booking" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{carName}</p>
                  </div>
                </div>

                <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 lg:min-w-48 lg:text-right">
                  <p className="text-xs font-medium uppercase text-emerald-700">Total amount</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-950">{formatCurrency(booking.total_amount)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <BookingInfoItem icon={<User className="h-4 w-4" />} label="Owner" value={ownerName} />
                <BookingInfoItem icon={<Calendar className="h-4 w-4" />} label="Start date" value={formatDate(booking.start_date)} />
                <BookingInfoItem icon={<Calendar className="h-4 w-4" />} label="End date" value={formatDate(booking.end_date)} />
                <BookingInfoItem icon={<Car className="h-4 w-4" />} label="Car" value={carName} />
                <BookingInfoItem icon={<DollarSign className="h-4 w-4" />} label="Payment" value={<StatusBadge status={paymentStatus} type="payment" />} />
                <BookingInfoItem icon={<Shield className="h-4 w-4" />} label="Deposit" value={<StatusBadge status={depositStatus} type="deposit" />} />
              </div>

              {(booking.owner?.phone || booking.owner?.email) && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">Owner Contact</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    {booking.owner?.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4 text-slate-500" /> {booking.owner.phone}</span>}
                    {booking.owner?.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4 text-slate-500" /> {booking.owner.email}</span>}
                  </div>
                </div>
              )}

              {booking.driver_notes && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <p className="mb-1 text-xs font-medium uppercase text-slate-500">Notes</p>
                  {booking.driver_notes}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={booking.status} type="booking" />
                <StatusBadge status={paymentStatus} type="payment" />
                <StatusBadge status={depositStatus} type="deposit" />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
              {canCancel && (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>Cancel Booking</Button>
              )}
              {canSubmitPayment && !showPaymentForm && (
                <Button onClick={() => setShowPaymentForm(true)}><DollarSign className="w-4 h-4" /> Submit Payment</Button>
              )}
              {paymentStatus === 'PAYMENT_VERIFIED' && agreementComplete && depositStatus === 'incomplete' && !showDepositForm && (
                <Button onClick={() => setShowDepositForm(true)}><Shield className="w-4 h-4" /> Submit Deposit</Button>
              )}
              {booking.status === 'BOOKING_APPROVED' && agreementComplete && (
                <Button onClick={() => navigate(`/driver/reviews?booking=${booking.id}`)}><Star className="w-4 h-4" /> Leave Review</Button>
              )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

            {showPaymentForm && (
              <Card>
                <CardContent className="space-y-4 p-4">
                  <PaymentMethodPanel
                    title="Payment Method"
                    amount={booking.total_amount}
                    methods={availablePaymentMethods}
                    selectedMethod={paymentMethod}
                    agencyPayment={selectedAgencyPayment}
                    onSelect={setPaymentMethod}
                  />
                  <FileUploader label="Upload payment proof" onUpload={handlePaymentUpload} />
                </CardContent>
              </Card>
            )}

            {showDepositForm && (
              <Card>
                <CardContent className="space-y-4 p-4">
                  <PaymentMethodPanel
                    title="Deposit Method"
                    amount={booking.deposit?.amount}
                    methods={availablePaymentMethods}
                    selectedMethod={paymentMethod}
                    agencyPayment={selectedAgencyPayment}
                    onSelect={setPaymentMethod}
                  />
                  <FileUploader label="Upload deposit proof" onUpload={handleDepositUpload} />
                </CardContent>
              </Card>
            )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking?"
        variant="destructive"
        confirmLabel="Cancel Booking"
        onConfirm={handleCancel}
      />
    </div>
  )
}

function BookingInfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</div>
      </div>
    </div>
  )
}

function PaymentMethodPanel({
  title,
  amount,
  methods,
  selectedMethod,
  agencyPayment,
  onSelect,
}: {
  title: string
  amount?: number | null
  methods: Array<{ value: string; label: string; icon: string }>
  selectedMethod: string
  agencyPayment: { accountName: string; accountNumber: string; qrImage: string }
  onSelect: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">Choose a payment method, scan the agency QR code, then upload your payment slip.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {methods.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onSelect(method.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              selectedMethod === method.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted'
            }`}
          >
            <span className="mr-1">{method.icon}</span>
            {method.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[160px_1fr]">
        <div className="flex aspect-square items-center justify-center rounded-lg bg-white p-3">
          <img src={agencyPayment.qrImage} alt="Agency payment QR code" className="h-full w-full object-contain" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <QrCode className="h-4 w-4" />
            Agency QR Code
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Account:</span> {agencyPayment.accountName}</p>
            <p><span className="text-muted-foreground">Phone:</span> {agencyPayment.accountNumber}</p>
            {amount ? <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(amount)}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function createQrPlaceholder(method: string, accountNumber: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <rect width="180" height="180" fill="white"/>
      <rect x="14" y="14" width="44" height="44" fill="#0f172a"/>
      <rect x="22" y="22" width="28" height="28" fill="white"/>
      <rect x="30" y="30" width="12" height="12" fill="#0f172a"/>
      <rect x="122" y="14" width="44" height="44" fill="#0f172a"/>
      <rect x="130" y="22" width="28" height="28" fill="white"/>
      <rect x="138" y="30" width="12" height="12" fill="#0f172a"/>
      <rect x="14" y="122" width="44" height="44" fill="#0f172a"/>
      <rect x="22" y="130" width="28" height="28" fill="white"/>
      <rect x="30" y="138" width="12" height="12" fill="#0f172a"/>
      <path d="M74 18h10v10H74zM96 18h10v20H96zM72 42h28v10H72zM112 72h12v12h-12zM132 72h24v10h-24zM72 74h12v24H72zM92 70h10v10H92zM108 96h48v10h-48zM70 112h22v10H70zM104 118h10v28h-10zM122 122h10v10h-10zM144 118h12v38h-12zM76 144h18v12H76zM96 156h34v10H96z" fill="#0f172a"/>
      <text x="90" y="91" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#0f172a">${method}</text>
      <text x="90" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#475569">${accountNumber}</text>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
