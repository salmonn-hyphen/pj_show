import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Fuel, Gauge, Users, MapPin, CalendarDays, Hash, Palette, Mail, ShieldCheck, GaugeCircle, Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { KYCLock } from '@/components/shared/KYCLock'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { useAuth, useToast } from '@/providers'
import { bookingsApi, carsApi } from '@/api'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Booking, Car } from '@/types'

const KYC_REQUIRED = ['verified', 'trusted']

function getBookingStageLabel(booking?: Booking | null) {
  if (!booking) return undefined

  const paymentStatus = booking.payment_status || booking.payment?.status || 'incomplete'

  if (booking.status === 'REQUESTED') return 'Request Sent'
  if (booking.status === 'PENDING_ADMIN_APPROVAL') return 'Awaiting Admin Review'
  if (booking.status === 'BOOKING_APPROVED' && ['incomplete', 'PAYMENT_REJECTED'].includes(paymentStatus)) return 'Payment Needed'
  if (booking.status === 'BOOKING_APPROVED') return 'Approved'
  if (booking.status === 'BOOKING_REJECTED') return 'Rejected'

  return 'View Booking'
}

export function DriverCarDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [showApply, setShowApply] = useState(false)
  const [existingBooking, setExistingBooking] = useState<Booking | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    const loadCar = async () => {
      if (!id) {
        setError('Car not found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await carsApi.getById(id)
        setCar(data)
      } catch (err: any) {
        setCar(null)
        setError(err.response?.data?.error || 'Car not found')
      } finally {
        setLoading(false)
      }
    }

    loadCar()
  }, [id])

  useEffect(() => {
    setImgIdx(0)
  }, [car?.id])

  useEffect(() => {
    const loadExistingBooking = async () => {
      if (!id || !user) {
        setExistingBooking(null)
        return
      }

      try {
        const res = await bookingsApi.getMyBookings()
        const booking = res.data.find((item) => String(item.car_id) === String(id)) || null
        const blocksNewApplication = booking
          ? !['BOOKING_REJECTED'].includes(String(booking.status))
          : false

        setExistingBooking(blocksNewApplication ? booking : null)
      } catch {
        setExistingBooking(null)
      }
    }

    loadExistingBooking()
  }, [id, user])

  if (loading) {
    return <LoadingSkeleton type="detail" count={3} />
  }

  if (!car || error) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium">{error || 'Car not found'}</p>
        <Button size="sm" className="mt-3" onClick={() => navigate('/driver/cars')}>Back to Browse</Button>
      </div>
    )
  }

  const photos = car.photos || []

  const handleApply = async () => {
    if (!car) return

    try {
      setApplying(true)
      const booking = await bookingsApi.create(car.id, {
        driver_notes: `Borrow request for ${car.brand} ${car.model}`,
      })
      setExistingBooking(booking)
      setShowApply(false)
      addToast('Borrow request sent to the owner.', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to send borrow request.', 'error')
    } finally {
      setApplying(false)
    }
  }

  const bookingStageLabel = getBookingStageLabel(existingBooking)
  const applyLabel = bookingStageLabel || (car.is_available ? 'Apply to Rent' : 'Unavailable')
  const displayRate = car.rental_price || car.daily_rate
  const rateLabel = car.rental_payment_type ? `/${car.rental_payment_type.toLowerCase()}` : '/day'

  const detailContent = (
    <div className="mx-auto max-w-5xl space-y-6">
      <button onClick={() => navigate('/driver/cars')} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back to Browse
      </button>

      <div className="relative rounded-xl overflow-hidden bg-muted aspect-[16/9] sm:aspect-[16/7]">
        <img
          src={photos[imgIdx]?.url || '/placeholder-car.svg'}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <button onClick={() => setImgIdx((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setImgIdx((i) => (i + 1) % photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{car.brand} {car.model}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" /> {car.city}, {car.location}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="gap-1"><Fuel className="w-3.5 h-3.5" /> {car.fuel_type}</Badge>
            <Badge variant="outline" className="gap-1"><Gauge className="w-3.5 h-3.5" /> {car.transmission}</Badge>
            <Badge variant="outline" className="gap-1"><Users className="w-3.5 h-3.5" /> {car.seat_capacity} seats</Badge>
            <Badge variant="outline">{car.year}</Badge>
          </div>

          {car.description && (
            <Card>
              <CardContent className="p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">{car.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4 sm:p-5">
              <h2 className="font-semibold mb-4">Car Information</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <CarInfoItem icon={<Fuel className="h-4 w-4" />} label="Fuel type" value={car.fuel_type} />
                <CarInfoItem icon={<Gauge className="h-4 w-4" />} label="Transmission" value={car.transmission} />
                <CarInfoItem icon={<Users className="h-4 w-4" />} label="Seat capacity" value={`${car.seat_capacity} seats`} />
                <CarInfoItem icon={<CalendarDays className="h-4 w-4" />} label="Year" value={String(car.year)} />
                <CarInfoItem icon={<Palette className="h-4 w-4" />} label="Color" value={car.color} />
                <CarInfoItem icon={<Hash className="h-4 w-4" />} label="License plate" value={car.license_plate} />
                {car.license_number && <CarInfoItem icon={<Hash className="h-4 w-4" />} label="License number" value={car.license_number} />}
                <CarInfoItem icon={<GaugeCircle className="h-4 w-4" />} label="Mileage" value={car.mileage !== null ? `${car.mileage.toLocaleString()} km` : 'Not provided'} />
                <CarInfoItem icon={<CarIcon />} label="Car type" value={car.car_type} />
                {car.rental_type && <CarInfoItem icon={<MapPin className="h-4 w-4" />} label="Rental type" value={car.rental_type.replace('_', ' ').toLowerCase()} />}
                {car.rental_period && <CarInfoItem icon={<Clock className="h-4 w-4" />} label="Rental period" value={car.rental_period} />}
                {car.owner_book && <CarInfoItem icon={<Hash className="h-4 w-4" />} label="Owner book" value={car.owner_book} />}
              </div>
            </CardContent>
          </Card>

          {car.features?.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Features</h2>
              <div className="flex flex-wrap gap-2">
                {car.features.map((f, i) => (
                  <Badge key={i} variant="secondary">{f}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-semibold mb-3">Owner Information</h2>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary font-semibold">
                    {car.owner?.profile_photo_url ? (
                      <img src={car.owner.profile_photo_url} alt={car.owner.name} className="h-full w-full object-cover" />
                    ) : (
                      car.owner?.name?.charAt(0) || 'O'
                    )}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div>
                      <p className="font-medium">{car.owner?.name || 'Owner'}</p>
                      {car.owner?.verification_status && (
                        <p className="mt-1 flex items-center gap-1 text-xs capitalize text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {car.owner.verification_status}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {car.owner?.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {car.owner.email}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-3xl font-bold text-primary">{formatCurrency(displayRate)}<span className="text-sm text-muted-foreground font-normal">{rateLabel}</span></p>
                {car.deposit_amount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">Deposit: {formatCurrency(car.deposit_amount)}</p>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-1.5">
                <p>Daily: {formatCurrency(car.daily_rate)}</p>
                {car.weekly_rate && <p>Weekly: {formatCurrency(car.weekly_rate)}</p>}
                {car.monthly_rate && <p>Monthly: {formatCurrency(car.monthly_rate)}</p>}
              </div>

              <Button
                className="w-full"
                size="lg"
                variant={bookingStageLabel ? 'outline' : 'default'}
                disabled={!bookingStageLabel && (!car.is_available || applying)}
                onClick={() => {
                  if (existingBooking) {
                    navigate(`/driver/bookings/${existingBooking.id}`)
                    return
                  }
                  setShowApply(true)
                }}
              >
                {applyLabel}
              </Button>

              {!car.is_available && <p className="text-xs text-muted-foreground">This car is currently unavailable.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to Rent</DialogTitle>
            <DialogDescription>
              You are applying to rent {car.brand} {car.model} at {formatCurrency(car.daily_rate)}/day.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowApply(false)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-black hover:bg-gray-100 hover:text-accent-foreground h-10 px-4 py-2">
              Cancel
            </button>
            <button disabled={applying} onClick={handleApply} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              {applying ? 'Sending...' : 'Send Application'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  if (user && !KYC_REQUIRED.includes(user.verification_status)) {
    return (
      <KYCLock feature="car applications">
        {detailContent}
      </KYCLock>
    )
  }

  return detailContent
}

function CarIcon() {
  return <Fuel className="h-4 w-4" />
}

function CarInfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null

  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold capitalize text-slate-950">{value}</p>
      </div>
    </div>
  )
}
