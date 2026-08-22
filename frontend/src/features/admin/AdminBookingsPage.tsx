import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { bookingsApi } from '@/api'
import { useToast } from '@/providers'
import type { Booking } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import {
  Car, Calendar, DollarSign, User, Eye, XCircle, CheckCircle2,
  Mail, Phone, ShieldCheck, FileText, Loader2, ZoomIn, X,
} from 'lucide-react'

export function AdminBookingsPage() {
  const { addToast } = useToast()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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
      setSelectedBooking(null)
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
          <TabsTrigger value="pending_admin_approval">Pending Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
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
                              <span className="text-[11px] text-emerald-600">
                                Agreement sent
                                {booking.is_agreement_locked === false && ' · Unlocked'}
                                {booking.is_agreement_locked === true && ' · Locked (payment pending)'}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedBooking(booking)} className="gap-1.5">
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </Button>
                            {booking.status === 'PENDING_ADMIN_APPROVAL' && (
                              <>
                                <Button size="sm" variant="success" disabled={processingId === booking.id} onClick={() => handleAdminAction(booking, 'accept')}>Approve</Button>
                                <Button size="sm" variant="destructive" disabled={processingId === booking.id} onClick={() => handleAdminAction(booking, 'reject')}>Reject</Button>
                              </>
                            )}
                            {booking.status === 'BOOKING_APPROVED' && !booking.agreement_sent_at && (
                              <Button size="sm" disabled={processingId === booking.id} onClick={() => handleAdminAction(booking, 'agreement')}>
                                Send Agreement
                              </Button>
                            )}
                          </div>
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

      {/* ─── Booking Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={!!selectedBooking} onOpenChange={(o) => { if (!o) setSelectedBooking(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Booking Details — {bookingRef(selectedBooking.id)}
                </DialogTitle>
                <DialogDescription>
                  Complete booking information between owner, driver, and car.
                </DialogDescription>
              </DialogHeader>

              {/* Booking Info */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Booking Information</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedBooking.status} type="booking" /></div>
                  <div><span className="text-muted-foreground">Owner Approval:</span> <span className="font-medium text-black">{selectedBooking.owner_approval_status || 'PENDING'}</span></div>
                  <div><span className="text-muted-foreground">Admin Approval:</span> <span className="font-medium text-black">{selectedBooking.admin_approval_status || 'PENDING'}</span></div>
                  <div><span className="text-muted-foreground">Agreement Status:</span> <span className="font-medium text-black">{selectedBooking.agreement_status || 'N/A'}</span></div>
                  <div><span className="text-muted-foreground">Total Amount:</span> <span className="font-medium text-black">{formatCurrency(selectedBooking.total_amount)}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium text-black">{formatDate(selectedBooking.created_at)}</span></div>
                  <div><span className="text-muted-foreground">Start Date:</span> <span className="font-medium text-black">{formatDate(selectedBooking.start_date)}</span></div>
                  <div><span className="text-muted-foreground">End Date:</span> <span className="font-medium text-black">{formatDate(selectedBooking.end_date)}</span></div>
                  {selectedBooking.agreement_sent_at && (
                    <div><span className="text-muted-foreground">Agreement Sent:</span> <span className="font-medium text-black">{formatDate(selectedBooking.agreement_sent_at)}</span></div>
                  )}
                  {selectedBooking.owner_agreement_agreed_at && (
                    <div><span className="text-muted-foreground">Owner Signed:</span> <span className="font-medium text-black">{formatDate(selectedBooking.owner_agreement_agreed_at)}</span></div>
                  )}
                  {selectedBooking.driver_agreement_agreed_at && (
                    <div><span className="text-muted-foreground">Driver Signed:</span> <span className="font-medium text-black">{formatDate(selectedBooking.driver_agreement_agreed_at)}</span></div>
                  )}
                </div>
              </div>

              {/* Driver Info */}
              {selectedBooking.driver && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Driver Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="font-medium text-black">{selectedBooking.driver.name}</span></div>
                    {selectedBooking.driver.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /><span className="text-black">{selectedBooking.driver.phone}</span></div>}
                    <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-400" /><span className="capitalize text-black">{selectedBooking.driver.verification_status || 'pending'}</span></div>
                  </div>
                </div>
              )}

              {/* Owner Info */}
              {selectedBooking.owner && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Owner Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="font-medium text-black">{selectedBooking.owner.name}</span></div>
                    {selectedBooking.owner.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /><span className="text-black">{selectedBooking.owner.phone}</span></div>}
                    <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-400" /><span className="capitalize text-black">{selectedBooking.owner.verification_status || 'pending'}</span></div>
                  </div>
                </div>
              )}

              {/* Car Info */}
              {selectedBooking.car && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Car Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                    <div><span className="text-muted-foreground">Brand:</span> <span className="font-medium text-black">{selectedBooking.car.brand}</span></div>
                    <div><span className="text-muted-foreground">Model:</span> <span className="font-medium text-black">{selectedBooking.car.model}</span></div>
                    <div><span className="text-muted-foreground">License:</span> <span className="font-medium text-black">{selectedBooking.car.license_number || selectedBooking.car.license_plate || '-'}</span></div>
                    <div><span className="text-muted-foreground">Fuel:</span> <span className="font-medium capitalize text-black">{selectedBooking.car.fuel_type || '-'}</span></div>
                    <div><span className="text-muted-foreground">Rental Price:</span> <span className="font-medium text-black">{formatCurrency(selectedBooking.car.daily_rate || selectedBooking.car.rental_price || 0)}</span></div>
                    <div><span className="text-muted-foreground">Deposit:</span> <span className="font-medium text-black">{formatCurrency(selectedBooking.car.deposit_amount || 0)}</span></div>
                    {selectedBooking.car.rental_period && <div><span className="text-muted-foreground">Rental Period:</span> <span className="font-medium text-black">{selectedBooking.car.rental_period}</span></div>}
                    {selectedBooking.car.rental_type && <div><span className="text-muted-foreground">Rental Type:</span> <span className="font-medium text-black">{selectedBooking.car.rental_type === 'DRIVER_HOME' ? 'Driver Home' : 'Owner Home'}</span></div>}
                  </div>
                  {/* Car Images */}
                  {selectedBooking.car.images && (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Front', url: selectedBooking.car.images.front_image },
                        { label: 'Back', url: selectedBooking.car.images.back_image },
                        { label: 'Left', url: selectedBooking.car.images.left_image },
                        { label: 'Right', url: selectedBooking.car.images.right_image },
                      ].filter(img => img.url).map(({ label, url }) => (
                        <div key={label} className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
                          <div
                            className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 group cursor-zoom-in"
                            onClick={() => setLightboxUrl(url!)}
                          >
                            <img src={url!} alt={`${selectedBooking.car.brand} ${label}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Agreement Info */}
              {(selectedBooking.agreement_sent_at || selectedBooking.owner_agreement_agreed_at || selectedBooking.driver_agreement_agreed_at) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Agreement Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                    <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-black">{selectedBooking.agreement_status || 'N/A'}</span></div>
                    {selectedBooking.agreement_sent_at && <div><span className="text-muted-foreground">Sent:</span> <span className="font-medium text-black">{formatDate(selectedBooking.agreement_sent_at)}</span></div>}
                    {selectedBooking.owner_agreement_agreed_at && <div><span className="text-muted-foreground">Owner Signed:</span> <span className="font-medium text-black">{formatDate(selectedBooking.owner_agreement_agreed_at)}</span></div>}
                    {selectedBooking.driver_agreement_agreed_at && <div><span className="text-muted-foreground">Driver Signed:</span> <span className="font-medium text-black">{formatDate(selectedBooking.driver_agreement_agreed_at)}</span></div>}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              {(selectedBooking.payment || selectedBooking.owner_payment) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment Information</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                    {selectedBooking.payment && (
                      <>
                        <div><span className="text-muted-foreground">Driver Payment:</span> <span className="font-medium text-black">{formatCurrency(selectedBooking.payment.amount || 0)}</span></div>
                        <div><span className="text-muted-foreground">Driver Status:</span> <span className="font-medium text-black">{selectedBooking.payment_status || 'incomplete'}</span></div>
                      </>
                    )}
                    {selectedBooking.owner_payment && (
                      <>
                        <div><span className="text-muted-foreground">Owner Payment:</span> <span className="font-medium text-black">{formatCurrency(selectedBooking.owner_payment.amount || 0)}</span></div>
                        <div><span className="text-muted-foreground">Owner Status:</span> <span className="font-medium text-black">{selectedBooking.owner_payment_status || 'incomplete'}</span></div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button onClick={() => setSelectedBooking(null)}>Close</Button>
                {selectedBooking.status === 'PENDING_ADMIN_APPROVAL' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleAdminAction(selectedBooking, 'reject')}
                      disabled={processingId === selectedBooking.id}
                      className="gap-2"
                    >
                      {processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleAdminAction(selectedBooking, 'accept')}
                      disabled={processingId === selectedBooking.id}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </Button>
                  </>
                )}
                {selectedBooking.status === 'BOOKING_APPROVED' && !selectedBooking.agreement_sent_at && (
                  <Button
                    disabled={processingId === selectedBooking.id}
                    onClick={() => handleAdminAction(selectedBooking, 'agreement')}
                    className="gap-2"
                  >
                    {processingId === selectedBooking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Send Agreement
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Lightbox ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <button className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors" onClick={() => setLightboxUrl(null)}>
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
