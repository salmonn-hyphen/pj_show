import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { paymentsApi } from '@/api'
import { useToast } from '@/providers'
import type { Payment } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import { CheckCircle, XCircle, DollarSign } from 'lucide-react'

export function AdminPaymentsPage() {
  const { addToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | number | null>(null)
  const [activeTab, setActiveTab] = useState('all')

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
    </div>
  )
}
