import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, ExternalLink, Eye, Loader2, Search, Upload, X } from 'lucide-react'
import { paymentsApi } from '@/api'
import type { Payment } from '@/types'
import { PAYMENT_METHODS } from '@/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/providers'
import { invalidateCache } from '@/hooks/useCachedFetch'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'

export function DriverPaymentsPage() {
  const { addToast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [proofPayment, setProofPayment] = useState<Payment | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('KBZPay')
  const [uploadingId, setUploadingId] = useState<string | number | null>(null)
  const [qrMethod, setQrMethod] = useState<(typeof PAYMENT_METHODS)[number] | null>(null)
  // Photo is selected first, then submitted explicitly via the Submit button.
  const [pendingProof, setPendingProof] = useState<{ id: string | number; file: File; previewUrl: string } | null>(null)

  const availablePaymentMethods = PAYMENT_METHODS.filter((method) =>
    ['KBZPay', 'WavePay', 'AYAPay'].includes(method.value),
  )

  const selectedMethod = availablePaymentMethods.find((method) => method.value === paymentMethod)

  const clearPendingProof = () => {
    setPendingProof((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
  }

  const handleSelectFile = (id: string | number, file: File) => {
    if (pendingProof) URL.revokeObjectURL(pendingProof.previewUrl)
    setPendingProof({ id, file, previewUrl: URL.createObjectURL(file) })
  }

  const loadPayments = () => {
    paymentsApi
      .getMyPayments()
      .then((res) => setPayments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPayments()
  }, [])

  useEffect(() => () => {
    if (pendingProof) URL.revokeObjectURL(pendingProof.previewUrl)
  }, [pendingProof])

  const handleSubmitProof = async (payment: Payment) => {
    if (!pendingProof || pendingProof.id !== payment.id) return
    try {
      setUploadingId(payment.id)
      const formData = new FormData()
      formData.append('method', paymentMethod)
      formData.append('screenshot', pendingProof.file)
      await paymentsApi.submitPayment(payment.booking_id, formData)
      addToast('Payment proof submitted for review', 'success')
      clearPendingProof()
      invalidateCache('driver-bookings')
      loadPayments()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
      addToast(message || 'Payment upload failed', 'error')
    } finally {
      setUploadingId(null)
    }
  }

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
                const canUpload = ['incomplete', 'PAYMENT_REJECTED'].includes(payment.status)
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
                              <p className="text-xl font-semibold text-foreground">
                                {payment.commission_amount ? (
                                  <span className="text-xl font-semibold text-foreground">
                                    {formatCurrency(payment.commission_amount)}
                                  </span>
                                ) : null}
                              </p>
                              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                                <p><span className="text-foreground">From:</span> {payment.transfer_from_name || 'Unknown'}</p>
                                <p><span className="text-foreground">To:</span> {payment.transfer_to_name || 'Taxi Meik Swe Agency'}</p>
                                {payment.owner_name && <p><span className="text-foreground">Owner:</span> {payment.owner_name}</p>}
                                <p><span className="text-foreground">Method:</span> {payment.method || 'Not submitted'}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {commissionRate}% commission
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

                        {canUpload && (
                          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger className="h-9 w-44 text-xs">
                                <SelectValue placeholder="Payment type" />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePaymentMethods.map((method) => (
                                  <SelectItem key={method.value} value={method.value}>
                                    {method.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedMethod?.qr_code && (
                              <button
                                type="button"
                                onClick={() => setQrMethod(selectedMethod)}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-100"
                                title={`Scan ${selectedMethod.label} QR code`}
                              >
                                <img
                                  src={selectedMethod.qr_code}
                                  alt={`${selectedMethod.label} QR code`}
                                  className="h-12 w-12 rounded-md object-contain"
                                />
                                <span className="pr-1 text-xs font-medium text-slate-600">
                                  Scan to pay via {selectedMethod.label}
                                </span>
                              </button>
                            )}
                            {pendingProof?.id === payment.id ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={pendingProof.previewUrl}
                                  alt="Selected proof"
                                  className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                                />
                                <span className="max-w-36 truncate text-xs text-slate-600">{pendingProof.file.name}</span>
                                <Button
                                  size="sm"
                                  variant="success"
                                  disabled={uploadingId === payment.id}
                                  onClick={() => handleSubmitProof(payment)}
                                >
                                  {uploadingId === payment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                  Submit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={uploadingId === payment.id}
                                  onClick={clearPendingProof}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <UploadProofButton onSelect={(file) => handleSelectFile(payment.id, file)} />
                            )}
                          </div>
                        )}
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
      <PaymentQrDialog method={qrMethod} onOpenChange={(open) => !open && setQrMethod(null)} />
    </div>
  )
}

function PaymentQrDialog({
  method,
  onOpenChange,
}: {
  method: (typeof PAYMENT_METHODS)[number] | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!method} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="w-[calc(100vw-2rem)] border-slate-200 bg-white sm:max-w-sm">
        <DialogClose className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80">
          <X className="h-4 w-4" />
        </DialogClose>
        <DialogHeader>
          <DialogTitle className="text-center text-slate-950">{method?.label} QR Code</DialogTitle>
          <DialogDescription className="text-center">
            Scan this QR code to pay your rental payment
          </DialogDescription>
        </DialogHeader>
        {method?.qr_code && (
          <div className="mx-auto">
            <img
              src={method.qr_code}
              alt={`${method.label} QR code`}
              className="h-56 w-56 rounded-xl border border-slate-200 bg-white object-contain p-2"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function UploadProofButton({ onSelect }: { onSelect: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('File size must be less than 5MB', 'error')
      } else {
        onSelect(file)
      }
      event.target.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <Button size="sm" variant="success" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        Choose photo
      </Button>
    </>
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
                <p className="text-2xl font-semibold text-black">{formatCurrency(payment.amount)}</p>
              </div>

              <div className="grid gap-3 text-sm">
                <PaymentProofDetail label="From" value={payment.transfer_from_name || 'Unknown'} />
                <PaymentProofDetail label="To" value={payment.transfer_to_name || 'Taxi Meik Swe Agency'} />
                <PaymentProofDetail label="Method" value={payment.method || 'Not submitted'} />
                <PaymentProofDetail label="Paid" value={payment.paid_at ? formatDate(payment.paid_at) : 'Awaiting proof'} />
              </div>

              {payment.screenshot_url && (
                <Button className="w-full" asChild>
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
      <p className="mt-1 font-medium text-black">{value}</p>
    </div>
  )
}
