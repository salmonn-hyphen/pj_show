import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { bookingsApi } from '@/api'
import type { Booking } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import { Car, Calendar, DollarSign, User } from 'lucide-react'

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
  }, [activeTab])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (activeTab !== 'all') params.status = activeTab
      const res = await bookingsApi.getAll(params)
      setBookings(res.data)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleAdminAction = async (booking: any, action: 'accept' | 'reject' | 'agreement') => {
    try {
      setProcessingId(booking.id)
      if (action === 'accept') {
        await bookingsApi.adminAcceptBooking(booking.id)
      } else if (action === 'reject') {
        await bookingsApi.adminRejectBooking(booking.id, 'Rejected by admin')
      } else {
        await bookingsApi.sendAgreement(booking.id)
      }
      await loadBookings()
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <LoadingSkeleton type="list" count={8} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Bookings</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="requested">Requested</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          {bookings.length === 0 ? (
            <EmptyState title="No bookings" />
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <motion.div key={booking.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Car className="w-5 h-5" /></div>
                          <div>
                            <p className="font-medium">{bookingRef(booking.id)}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {booking.car?.brand || 'N/A'}</span>
                              <span className="flex items-center gap-1"><User className="w-3 h-3" /> Driver: {booking.driver?.name || 'N/A'}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(booking.start_date)}</span>
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatCurrency(booking.total_amount)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={booking.status} type="booking" />
                            <span className="text-[11px] text-muted-foreground">
                              Owner: {booking.owner_approval_status || 'PENDING'} / Admin: {booking.admin_approval_status || 'PENDING'}
                            </span>
                            {booking.agreement_sent_at && (
                              <span className="text-[11px] text-emerald-600">Agreement sent</span>
                            )}
                          </div>
                          {booking.owner_approval_status === 'APPROVED' && booking.admin_approval_status === 'PENDING' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="success" disabled={processingId === booking.id} onClick={() => handleAdminAction(booking, 'accept')}>Accept</Button>
                              <Button size="sm" variant="destructive" disabled={processingId === booking.id} onClick={() => handleAdminAction(booking, 'reject')}>Reject</Button>
                            </div>
                          )}
                          {booking.admin_approval_status === 'APPROVED' && !booking.agreement_sent_at && (
                            <Button size="sm" disabled={processingId === booking.id} onClick={() => handleAdminAction(booking, 'agreement')}>
                              Send Agreement
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
