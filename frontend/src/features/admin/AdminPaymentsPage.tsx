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
import { paymentsApi } from '@/api'
import { useToast } from '@/providers'
import type { Payment } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import {
  CheckCircle, XCircle, DollarSign, Eye, User,
  FileText, Loader2, ZoomIn, X, Car as CarIcon,
} from 'lucide-react'

export function AdminPaymentsPage() {
  const { addToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | number | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    try {
      const data = await paymentsApi.getPendingPayments()
      setPayments(data)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (id: string | number) => {
    try {
      setProcessing(id)
      await paymentsApi.confirmPayment(id)
      addToast('Payment verified — agreement unlocked if all payments are complete', 'success')
      setPayments((prev) => prev.filter((p) => p.id !== id))
      setSelectedPayment(null)
    } catch {
      addToast('Failed to verify', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string | number) => {
    try {
      setProcessing(id)
      await paymentsApi.rejectPayment(id, 'Invalid payment')
      addToast('Payment rejected', 'info')
      setPayments((prev) => prev.filter((p) => p.id !== id))
      setSelectedPayment(null)
    } catch {
      addToast('Failed to reject', 'error')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <LoadingSkeleton type="list" count={5} />

  const counts = {
    all: payments.length,
    driver: payments.filter((payment) => (payment.payer_role || 'DRIVER') === 'DRIVER').length,
    owner: payments.filter((payment) => payment.payer_role === 'OWNER').length,
  }
  const filteredPayments = payments.filter((payment) => {
    if (activeTab === 'driver') return (payment.payer_role || 'DRIVER') === 'DRIVER'
    if (activeTab === 'owner') return payment.payer_role === 'OWNER'
    return true
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment Approvals</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All Pending ({counts.all})</TabsTrigger>
          <TabsTrigger value="driver">Driver Payments ({counts.driver})</TabsTrigger>
          <TabsTrigger value="owner">Owner Commission ({counts.owner})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredPayments.length === 0 ? (
            <EmptyState title="No pending payments" description="All payments in this section have been processed." />
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment) => (
                <motion.div key={payment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><DollarSign className="w-5 h-5" /></div>
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {payment.method} &middot; {payment.payer_role || 'DRIVER'} &middot; {bookingRef(payment.booking_id)} &middot; {formatDate(payment.paid_at)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              From {payment.transfer_from_name || 'Unknown'} to {payment.transfer_to_name || 'Taxi Meik Swe Agency'}
                            </p>
                            {(payment.driver_name || payment.owner_name) && (
                              <p className="text-xs text-muted-foreground">
                                Driver {payment.driver_name || 'N/A'} &middot; Owner {payment.owner_name || 'N/A'}
                              </p>
                            )}
                            {payment.commission_rate !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                Commission {Math.round((payment.commission_rate || 0) * 100)}%
                                {payment.commission_amount ? ` (${formatCurrency(payment.commission_amount)})` : ''}
                              </p>
                            )}
                            {payment.screenshot_url && (
                              <img src={payment.screenshot_url} alt="Payment proof" className="mt-2 h-20 rounded-lg object-cover" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end lg:self-auto">
                          <StatusBadge status={payment.status} type="payment" />
                          <Button size="sm" variant="outline" onClick={() => setSelectedPayment(payment)} className="gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> View Receipt
                          </Button>
                          <Button size="sm" variant="success" onClick={() => handleConfirm(payment.id)} disabled={processing === payment.id}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Verify
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(payment.id)} disabled={processing === payment.id}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
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

      {/* ─── Payment Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={!!selectedPayment} onOpenChange={(o) => { if (!o) setSelectedPayment(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Payment Details
                </DialogTitle>
                <DialogDescription>
                  Review payment information and receipt before confirming or rejecting.
                </DialogDescription>
              </DialogHeader>

              {/* Payment Info */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment Information</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                  <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium text-black">{formatCurrency(selectedPayment.amount)}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedPayment.status} type="payment" /></div>
                  <div><span className="text-muted-foreground">Method:</span> <span className="font-medium capitalize">{selectedPayment.method || '-'}</span></div>
                  <div><span className="text-muted-foreground">Payer Role:</span> <span className="font-medium text-black">{selectedPayment.payer_role || 'DRIVER'}</span></div>
                  <div><span className="text-muted-foreground">Purpose:</span> <span className="font-medium capitalize text-black">{(selectedPayment.payment_purpose || 'rental_payment').replace(/_/g, ' ')}</span></div>
                  <div><span className="text-muted-foreground">Booking:</span> <span className="font-medium text-black">{bookingRef(selectedPayment.booking_id)}</span></div>
                  {selectedPayment.commission_rate !== undefined && (selectedPayment.commission_rate || 0) > 0 && (
                    <>
                      <div><span className="text-muted-foreground">Commission Rate:</span> <span className="font-medium text-black">{Math.round((selectedPayment.commission_rate || 0) * 100)}%</span></div>
                      <div><span className="text-muted-foreground">Commission Amount:</span> <span className="font-medium text-black">{formatCurrency(selectedPayment.commission_amount || 0)}</span></div>
                    </>
                  )}
                  <div><span className="text-muted-foreground">Paid At:</span> <span className="font-medium text-black">{formatDate(selectedPayment.paid_at)}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium text-black">{formatDate(selectedPayment.created_at)}</span></div>
                  {selectedPayment.transaction_id && <div><span className="text-muted-foreground">Transaction ID:</span> <span className="font-medium text-black">{selectedPayment.transaction_id}</span></div>}
                </div>
              </div>

              {/* Payer Info */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payer Information</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="font-medium text-black">{selectedPayment.transfer_from_name || 'Unknown'}</span></div>
                  {selectedPayment.driver_name && <div className="flex items-center gap-2"><CarIcon className="w-4 h-4 text-slate-400" /><span className="font-medium text-black">Driver: {selectedPayment.driver_name}</span></div>}
                  {selectedPayment.owner_name && <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="font-medium text-black">Owner: {selectedPayment.owner_name}</span></div>}
                  <div><span className="text-muted-foreground">To:</span> <span className="font-medium text-black">{selectedPayment.transfer_to_name || 'Taxi Meik Swe Agency'}</span></div>
                </div>
              </div>

              {/* Payment Slip / Receipt */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment Slip / Receipt</p>
                {selectedPayment.screenshot_url ? (
                  <div
                    className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-zoom-in max-w-md"
                    onClick={() => setLightboxUrl(selectedPayment.screenshot_url)}
                  >
                    <img
                      src={selectedPayment.screenshot_url}
                      alt="Payment receipt"
                      className="w-full h-auto object-contain max-h-80"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <ZoomIn className="w-5 h-5" /> Click to enlarge
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <FileText className="w-10 h-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No payment receipt available.</p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button onClick={() => setSelectedPayment(null)}>Close</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedPayment.id)}
                  disabled={processing === selectedPayment.id}
                  className="gap-2"
                >
                  {processing === selectedPayment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleConfirm(selectedPayment.id)}
                  disabled={processing === selectedPayment.id}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {processing === selectedPayment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirm
                </Button>
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
              alt="Payment receipt"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
