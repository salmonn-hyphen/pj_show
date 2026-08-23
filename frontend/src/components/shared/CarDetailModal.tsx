import { useState } from 'react'
import { ChevronLeft, ChevronRight, Fuel, Gauge, Users, MapPin, CalendarDays, Palette, Hash, ShieldCheck, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/utils/format'
import type { Car } from '@/types'

interface CarDetailModalProps {
  car: Car | null
  open: boolean
  onClose: () => void
  onApply: (carId: string | number) => void | Promise<void>
  bookingStageLabel?: string
  applying?: boolean
  applyDisabled?: boolean
}

export function CarDetailModal({ car, open, onClose, onApply, bookingStageLabel, applying, applyDisabled }: CarDetailModalProps) {
  const [imgIdx, setImgIdx] = useState(0)

  if (!car) return null

  const photos = car.photos || []
  const displayRate = car.rental_price || car.daily_rate
  const location = [car.city, car.location].filter(Boolean).join(', ') || 'Location not provided'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <div className="relative aspect-[16/8] overflow-hidden bg-muted">
          <img
            src={photos[imgIdx]?.url || '/placeholder-car.svg'}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setImgIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImgIdx((i) => (i + 1) % photos.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-5 space-y-4">
          <DialogHeader className="p-0">
            <DialogTitle className="text-lg font-bold text-left">{car.brand} {car.model}</DialogTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" /> {location}
            </p>
          </DialogHeader>

          <div className="flex flex-wrap gap-1.5">
            {car.fuel_type && <Badge variant="outline" className="text-xs gap-1 py-0.5"><Fuel className="w-3 h-3" /> {car.fuel_type}</Badge>}
            {car.transmission && <Badge variant="outline" className="text-xs gap-1 py-0.5"><Gauge className="w-3 h-3" /> {car.transmission}</Badge>}
            {car.seat_capacity && <Badge variant="outline" className="text-xs gap-1 py-0.5"><Users className="w-3 h-3" /> {car.seat_capacity} seats</Badge>}
            {car.year && <Badge variant="outline" className="text-xs py-0.5">{car.year}</Badge>}
            {car.color && <Badge variant="outline" className="text-xs gap-1 py-0.5"><Palette className="w-3 h-3" /> {car.color}</Badge>}
          </div>

          {car.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{car.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            {car.license_plate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="w-3.5 h-3.5" /> <span className="text-xs">{car.license_plate}</span>
              </div>
            )}
            {car.mileage !== null && car.mileage !== undefined && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="w-3.5 h-3.5" /> <span className="text-xs">{car.mileage.toLocaleString()} km</span>
              </div>
            )}
          </div>

          {car.features && car.features.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Features</p>
              <div className="flex flex-wrap gap-1.5">
                {car.features.map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] py-0.5">{f}</Badge>
                ))}
              </div>
            </div>
          )}

          {car.owner && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {car.owner.profile_photo_url ? (
                      <img src={car.owner.profile_photo_url} alt={car.owner.name} className="h-full w-full object-cover" />
                    ) : (
                      car.owner.name?.charAt(0) || 'O'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{car.owner.name || 'Owner'}</p>
                    {car.owner.verification_status && (
                      <p className="text-[10px] flex items-center gap-0.5 text-muted-foreground capitalize">
                        <ShieldCheck className="w-2.5 h-2.5" /> {car.owner.verification_status}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(displayRate)}
                  <span className="text-xs text-muted-foreground font-normal ml-0.5">
                    {car.rental_payment_type ? `/${car.rental_payment_type.toLowerCase()}` : '/day'}
                  </span>
                </p>
                {car.deposit_amount > 0 && (
                  <p className="text-sm font-medium text-slate-600">
                    Deposit: {formatCurrency(car.deposit_amount)}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                disabled={!car.is_available || applying || !!bookingStageLabel || applyDisabled}
                onClick={() => onApply(car.id)}
              >
                {applying ? 'Sending...' : bookingStageLabel || (applyDisabled ? 'Active Booking' : 'Apply to Rent')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
