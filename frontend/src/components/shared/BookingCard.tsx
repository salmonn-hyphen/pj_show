import { motion } from 'framer-motion'
import { Calendar, Car, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import type { Booking } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'

interface BookingCardProps {
  booking: Booking
  onView?: (id: string | number) => void
  actions?: React.ReactNode
}

export function BookingCard({ booking, onView, actions }: BookingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:border-slate-300 hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-950">
                  {booking.car ? `${booking.car.brand} ${booking.car.model}` : bookingRef(booking.id)}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {formatCurrency(booking.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={booking.status} type="booking" />
              <div className="flex gap-2">
                {onView && (
                  <Button size="sm" variant="outline" onClick={() => onView(booking.id)}>
                    Details
                  </Button>
                )}
                {actions}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
