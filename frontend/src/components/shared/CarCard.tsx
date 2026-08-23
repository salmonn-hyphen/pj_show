import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/utils/format'

interface CarCardProps {
  car: any
  onView?: (id: string | number) => void
  onBook?: (id: string | number) => void | Promise<void>
  bookingStageLabel?: string
  onBookingStageClick?: () => void
  applyDisabled?: boolean
}

export function CarCard({ car, onView, onBook, bookingStageLabel, onBookingStageClick, applyDisabled }: CarCardProps) {
  const photos = car.photos || []
  const [imgIdx, setImgIdx] = useState(0)
  const [applying, setApplying] = useState(false)
  const displayRate = car.rental_price || car.daily_rate
  const location = [car.city, car.location].filter(Boolean).join(', ') || 'Location not provided'

  const handleApply = async () => {
    if (!onBook || applying) return

    try {
      setApplying(true)
      await onBook(car.id)
    } finally {
      setApplying(false)
    }
  }

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setImgIdx((i) => (i - 1 + photos.length) % photos.length)
  }
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setImgIdx((i) => (i + 1) % photos.length)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm transition-all hover:border-slate-300 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={photos[imgIdx]?.url || '/placeholder-car.svg'}
          alt={`${car.brand} ${car.model}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {car.is_available && car.status === 'verified' && (
          <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            Available
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={nextImg} className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
              {photos.map((_: unknown, i: number) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold leading-5 text-slate-950">
            {car.brand} {car.model}
          </h3>
          <p className="mt-1 flex items-start gap-1 text-xs leading-4 text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{location}</span>
          </p>
        </div>

        {car.description && (
          <p className="mt-1.5 line-clamp-1 text-xs leading-4 text-slate-500">{car.description}</p>
        )}

        <div className="mt-auto space-y-2 border-t border-slate-200 pt-2">
          <div>
            <p className="text-base font-bold text-slate-950">
              {formatCurrency(displayRate)}
            </p>
            {car.deposit_amount > 0 && (
              <p className="text-[10px] text-slate-500">Deposit: {formatCurrency(car.deposit_amount)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onView?.(car.id)}>View</Button>
            {bookingStageLabel ? (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onBookingStageClick}>
                {bookingStageLabel}
              </Button>
            ) : car.is_available && car.status === 'verified' && (
              <Button size="sm" className="h-8 text-xs" disabled={applying || applyDisabled} onClick={handleApply}>
                {applying ? 'Sending...' : applyDisabled ? 'Active Booking' : 'Apply to Rent'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
