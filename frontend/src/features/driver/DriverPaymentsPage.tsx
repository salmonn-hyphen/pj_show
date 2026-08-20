import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, ExternalLink, Eye, Search } from 'lucide-react'
import { paymentsApi } from '@/api'
import type { Payment } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'

export function DriverPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [proofPayment, setProofPayment] = useState<Payment | null>(null)

  useEffect(() => {
    paymentsApi.getMyPayments().then((res) => setPayments(res.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filteredPayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) return payments

    return payments.filter((payment) =>
      [
        payment.booking_id,
        payment.transfer_from_name,
        payment.transfer_to_name,
        payment.driver_name,
        payment.owner_name,
        payment.method,
        payment.status,
      ].some((value) => String(value || '').toLowerCase().includes(query)),
    )
  }, [payments, searchTerm])

  if (loading) return <LoadingSkeleton type="list" />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">Track rental payment proof and payment review status.</p>
      </div>

      {payments.length === 0 ? (
        <EmptyState title="No payments" description="Payment history will appear here." />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search booking or name"
                className="pl-9"
              />
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <EmptyState title="No matching payments" description="Try another search term." />
          ) : (
            <div className="grid gap-3">
              {filteredPayments.map((payment) => {
                const paymentPurpose = payment.payment_purpose === 'driver_rental_payment' ? 'Rental payment' : 'Payment'
                const commissionRate = Math.round((payment.commission_rate || 0) * 100)

                return (
                  <motion.div key={payment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card>
                      <CardContent className="space-y-4 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div>
                                <p className="text-sm font-semibold">{bookingRef(payment.booking_id)}</p>
                                <p className="text-xs text-muted-foreground">{paymentPurpose}</p>
                              </div>
                              <p className="text-xl font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                                <p><span className="text-foreground">From:</span> {payment.transfer_from_name || 'Unknown'}</p>
                                <p><span className="text-foreground">To:</span> {payment.transfer_to_name || 'Taxi Meik Swe Agency'}</p>
                                {payment.owner_name && <p><span className="text-foreground">Owner:</span> {payment.owner_name}</p>}
                                <p><span className="text-foreground">Method:</span> {payment.method || 'Not submitted'}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {commissionRate}% commission
                                {payment.commission_amount ? ` (${formatCurrency(payment.commission_amount)})` : ''}
                                {' '}· {payment.paid_at ? `Paid ${formatDate(payment.paid_at)}` : 'Awaiting proof'}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 self-start">
                            {payment.screenshot_url && (
                              <Button size="sm" variant="outline" onClick={() => setProofPayment(payment)}>
                                <Eye className="h-4 w-4" />
                                View proof
                              </Button>
                            )}
                            <StatusBadge status={payment.status} type="payment" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <PaymentProofDialog payment={proofPayment} onOpenChange={(open) => !open && setProofPayment(null)} />
    </div>
  )
}

function PaymentProofDialog({
  payment,
  onOpenChange,
}: {
  payment: Payment | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>Payment Proof</DialogTitle>
              <DialogDescription>
                {payment ? `${bookingRef(payment.booking_id)}` : 'Payment proof'}
              </DialogDescription>
            </div>
            {payment && <StatusBadge status={payment.status} type="payment" />}
          </div>
        </DialogHeader>

        {payment && (
          <div className="grid max-h-[calc(92vh-88px)] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-[360px] items-center justify-center bg-muted/20 p-4 sm:min-h-[520px]">
              {payment.screenshot_url ? (
                <img
                  src={payment.screenshot_url}
                  alt={`Payment proof for booking ${payment.booking_id}`}
                  className="max-h-[68vh] w-full rounded-lg object-contain shadow-sm"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No proof image available.</p>
              )}
            </div>

            <div className="space-y-4 border-t p-5 lg:border-l lg:border-t-0">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-2xl font-semibold">{formatCurrency(payment.amount)}</p>
              </div>

              <div className="grid gap-3 text-sm">
                <PaymentProofDetail label="From" value={payment.transfer_from_name || 'Unknown'} />
                <PaymentProofDetail label="To" value={payment.transfer_to_name || 'Taxi Meik Swe Agency'} />
                <PaymentProofDetail label="Method" value={payment.method || 'Not submitted'} />
                <PaymentProofDetail label="Paid" value={payment.paid_at ? formatDate(payment.paid_at) : 'Awaiting proof'} />
              </div>

              {payment.screenshot_url && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={payment.screenshot_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open full size
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PaymentProofDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
