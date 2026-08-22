import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CarFront, CheckCircle2, Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CarCard } from '@/components/shared/CarCard'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { bookingsApi, carsApi } from '@/api'
import { useToast } from '@/providers'
import type { Booking, Car } from '@/types'

const PER_PAGE_DESKTOP = 9
const PER_PAGE_MOBILE = 6

export function DriverBrowseCarsPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [fuelFilter, setFuelFilter] = useState('all')
  const [transmissionFilter, setTransmissionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [cars, setCars] = useState<Car[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const perPage = isMobile ? PER_PAGE_MOBILE : PER_PAGE_DESKTOP

  useEffect(() => {
    const loadCars = async () => {
      try {
        setLoading(true)
        setError(null)
        const [response, bookingResponse] = await Promise.all([
          carsApi.list({ verified_only: true }),
          bookingsApi.getMyBookings(),
        ])
        setCars(response.data || [])
        setBookings(bookingResponse.data || [])
      } catch (err: any) {
        setCars([])
        setBookings([])
        setError(err.response?.data?.error || 'Failed to load cars.')
      } finally {
        setLoading(false)
      }
    }

    loadCars()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return cars.filter((c) => {
      const matchesSearch = !q
        || c.brand.toLowerCase().includes(q)
        || c.model.toLowerCase().includes(q)
        || c.city?.toLowerCase().includes(q)
        || c.location?.toLowerCase().includes(q)
      const matchesFuel = fuelFilter === 'all' || c.fuel_type === fuelFilter
      const matchesTransmission = transmissionFilter === 'all' || c.transmission === transmissionFilter

      return matchesSearch && matchesFuel && matchesTransmission
    })
  }, [cars, fuelFilter, search, transmissionFilter])

  const fuelOptions = useMemo(() => Array.from(new Set(cars.map((car) => car.fuel_type).filter(Boolean))), [cars])
  const transmissionOptions = useMemo(() => Array.from(new Set(cars.map((car) => car.transmission).filter(Boolean))), [cars])
  const verifiedAvailable = cars.filter((car) => car.is_available && car.status === 'verified').length
  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const handlePage = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const clearFilters = () => {
    setSearch('')
    setFuelFilter('all')
    setTransmissionFilter('all')
    setPage(1)
  }

  const handleApply = async (carId: string | number) => {
    const car = cars.find((item) => String(item.id) === String(carId))

    try {
      const booking = await bookingsApi.create(carId, {
        driver_notes: car ? `Borrow request for ${car.brand} ${car.model}` : undefined,
      })
      setBookings((current) => [booking, ...current])
      addToast('Application sent to the owner.', 'success')
      navigate(`/driver/bookings/${booking.id}`)
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to send application.', 'error')
    }
  }

  const getCarBooking = (carId: string | number) =>
    bookings.find((booking) =>
      String(booking.car_id) === String(carId) &&
      !['BOOKING_REJECTED'].includes(String(booking.status)),
    )

  const getBookingStageLabel = (booking?: Booking) => {
    if (!booking) return undefined

    const paymentStatus = booking.payment_status || booking.payment?.status || 'incomplete'

    if (booking.status === 'REQUESTED') return 'Request Sent'
    if (booking.status === 'PENDING_ADMIN_APPROVAL') return 'Awaiting Admin Review'
    if (booking.status === 'BOOKING_APPROVED' && ['incomplete', 'PAYMENT_REJECTED'].includes(paymentStatus)) return 'Payment Needed'
    if (booking.status === 'BOOKING_APPROVED') return 'Approved'
    if (booking.status === 'BOOKING_REJECTED') return 'Rejected'

    return 'View Booking'
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
   

      <div className="rounded-2xl">
        <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto] lg:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search brand, model, city, or pickup location"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-11 pl-9"
            />
          </div>

          <label className="relative">
            <span className="sr-only">Fuel type</span>
            <select
              value={fuelFilter}
              onChange={(e) => { setFuelFilter(e.target.value); setPage(1) }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All fuel</option>
              {fuelOptions.map((fuel) => (
                <option key={fuel} value={fuel}>{fuel}</option>
              ))}
            </select>
          </label>


        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="card" count={8} />
      ) : error ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Could not load cars</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-muted-foreground">
          <CarFront className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-lg font-semibold text-slate-900">No cars found</p>
          <p className="text-sm">Try a broader search or reset the filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((car) => {
              const booking = getCarBooking(car.id)

              return (
                <CarCard
                  key={car.id}
                  car={car}
                  onView={(id) => navigate(`/driver/cars/${id}`)}
                  onBook={handleApply}
                  bookingStageLabel={getBookingStageLabel(booking)}
                  onBookingStageClick={booking ? () => navigate(`/driver/bookings/${booking.id}`) : undefined}
                />
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => handlePage(page - 1)}>Previous</Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={page === i + 1 ? 'default' : 'outline'}
                  onClick={() => handlePage(i + 1)}
                  className="min-w-[36px]"
                >
                  {i + 1}
                </Button>
              ))}
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
