import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CarFront, Calendar, Fuel, Hash, WalletCards, MapPin, BadgeCheck, ChevronLeft, ChevronRight, Power, Edit, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import type { Car } from '@/types'
import { formatCurrency } from '@/utils/format'

interface OwnerCarDetailModalProps {
  car: Car | null
  onClose: () => void
  onToggleAvailability: (id: string) => Promise<void>
}

export function OwnerCarDetailModal({ car, onClose, onToggleAvailability }: OwnerCarDetailModalProps) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)

  if (!car) return null

  const photoViews = [
    { label: 'Front', url: car.images?.front_image },
    { label: 'Back', url: car.images?.back_image },
    { label: 'Left', url: car.images?.left_image },
    { label: 'Right', url: car.images?.right_image },
  ].filter((photo): photo is { label: string; url: string } => Boolean(photo.url))

  const photos = photoViews.length > 0 ? photoViews : car.photos?.map((p) => ({ label: 'Photo', url: p.url })) || []
  const safeIndex = Math.min(index, Math.max(photos.length - 1, 0))

  const canEdit = car.status !== 'verified' && car.admin_approval_status !== 'APPROVED'

  const infoItems = [
    { icon: <Fuel className="h-4 w-4" />, label: 'Fuel Type', value: car.fuel_type ? car.fuel_type.charAt(0).toUpperCase() + car.fuel_type.slice(1) : '-' },
    { icon: <Calendar className="h-4 w-4" />, label: 'Payment Type', value: car.rental_payment_type ? car.rental_payment_type.charAt(0) + car.rental_payment_type.slice(1).toLowerCase() : '-' },
    { icon: <CarFront className="h-4 w-4" />, label: 'Rental Type', value: car.rental_type ? car.rental_type.replace('_', ' ') : '-' },
    { icon: <Hash className="h-4 w-4" />, label: 'License Number', value: car.license_plate || car.license_number || '-' },
    { icon: <BadgeCheck className="h-4 w-4" />, label: 'Owner Book', value: car.owner_book || '-' },
    { icon: <MapPin className="h-4 w-4" />, label: 'City', value: car.city || '-' },
    { icon: <WalletCards className="h-4 w-4" />, label: 'Deposit', value: formatCurrency(car.deposit_amount) },
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" hideCloseButton>
        <div className="relative h-48 w-full bg-slate-100">
          <DialogClose className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          {photos.length > 0 ? (
            <>
              <img src={photos[safeIndex].url} alt={`${car.brand} ${car.model}`} className="h-full w-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setIndex(safeIndex > 0 ? safeIndex - 1 : photos.length - 1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setIndex(safeIndex < photos.length - 1 ? safeIndex + 1 : 0)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                    {photos.map((photo, i) => (
                      <button
                        key={photo.label + i}
                        onClick={() => setIndex(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i === safeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80',
                        )}
                        aria-label={`Go to photo ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <CarFront className="h-8 w-8" />
              No photos
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-950">
                {car.brand} {car.model}
                {car.year ? <span className="text-slate-500"> ({car.year})</span> : null}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <StatusBadge status={car.status} type="verification" />
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', car.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}>
                  {car.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>
            <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-right">
              <p className="text-[10px] font-medium uppercase text-emerald-700">Rental price</p>
              <p className="text-sm font-semibold text-emerald-950">{formatCurrency(car.daily_rate)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase text-slate-500">{item.label}</p>
                  <p className="truncate text-xs font-medium text-slate-950">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            {canEdit && (
              <Button
                size="sm"
                className="h-8 px-3 text-xs bg-slate-800 text-white hover:bg-slate-700"
                onClick={() => {
                  onClose()
                  navigate(`/owner/cars/${car.id}/edit`)
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 px-3 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onToggleAvailability(car.id)}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" /> {car.is_available ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}