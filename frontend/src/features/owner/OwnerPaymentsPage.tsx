import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, CreditCard, DollarSign, Eye, Loader2, ReceiptText, Search, Upload, UserRound, X } from 'lucide-react'
import { paymentsApi } from '@/api'
import type { Payment } from '@/types'
import { PAYMENT_METHODS } from '@/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useToast } from '@/providers'
import { formatCurrency, formatDate, bookingRef } from '@/utils/format'
import { useCachedFetch, invalidateCache } from '@/hooks/useCachedFetch'

export function OwnerPaymentsPage() {
  const { addToast } = useToast()
  const { data: payments = [], isLoading: loading, refresh } = useCachedFetch<Payment[]>('owner-payments', () => paymentsApi.getOwnerPayments().then((res) => res.data))
  const [paymentMethod, setPaymentMethod] = useState('KBZPay')
  const [uploadingId, setUploadingId] = useState<string | number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [proofPayment, setProofPayment] = useState<Payment | null>(null)
  const [qrMethod, setQrMethod] = useState<(typeof PAYMENT_METHODS)[number] | null>(null)
  // Photo is selected first, then submitted explicitly via the Submit button.
  const [pendingProof, setPendingProof] = useState<{ id: string | number; file: File; previewUrl: string } | null>(null)

  const availablePaymentMethods = PAYMENT_METHODS.filter((method) =>
    ['KBZPay', 'WavePay', 'AYAPay'].includes(method.value),
  )

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

  const handleSubmitProof = async (payment: Payment) => {
    if (!pendingProof || pendingProof.id !== payment.id) return
    try {
      setUploadingId(payment.id)
      const formData = new FormData()
      formData.append('method', paymentMethod)
      formData.append('screenshot', pendingProof.file)
      await paymentsApi.submitPayment(payment.booking_id, formData)
      addToast('Owner commission submitted for review', 'success')
      clearPendingProof()
      invalidateCache('owner-payments')
      invalidateCache('owner-bookings')
      refresh()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
      addToast(message || 'Payment upload failed', 'error')
    } finally {
      setUploadingId(null)
    }
  }

  useEffect(() => () => {
    if (pendingProof) URL.revokeObjectURL(pendingProof.previewUrl)
  }, [pendingProof])

  const selectedMethod = availablePaymentMethods.find((method) => method.value === paymentMethod)

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
        <h1 className="text-2xl font-bold">Commission Payments</h1>
        <p className="text-sm text-muted-foreground">Track owner commission proof and payment review status.</p>
      </div>

      {payments.length === 0 ? (
        <EmptyState title="No owner payments" description="Commission payments will appear after bookings are approved." />
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
                const paymentPurpose = payment.payment_purpose === 'owner_commission' ? 'Owner commission' : 'Payment'
                const commissionRate = Math.round((payment.commission_rate || 0) * 100)

                return (
                  <motion.div key={payment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-slate-200 bg-white">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">{bookingRef(payment.booking_id)}</p>
                              <p className="text-xs text-muted-foreground">{paymentPurpose}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {payment.screenshot_url && (
                              <Button size="sm" variant="outline" onClick={() => setProofPayment(payment)}>
                                <Eye className="h-4 w-4" />
                                View proof
                              </Button>
                            )}
                            <StatusBadge status={payment.status} type="payment" />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <p className="text-lg font-semibold text-slate-950">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">From:</span> {payment.transfer_from_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">To:</span> {payment.transfer_to_name || 'Taxi Meik Swe Agency'}
                          </p>
                          {payment.driver_name && (
                            <p className="text-xs text-slate-500">
                              <span className="font-medium text-slate-700">Driver:</span> {payment.driver_name}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Method:</span> {payment.method || 'Not submitted'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {commissionRate}% commission
                            {payment.commission_amount ? ` (${formatCurrency(payment.commission_amount)})` : ''}
                            {' '}· {payment.paid_at ? `Paid ${formatDate(payment.paid_at)}` : 'Awaiting proof'}
                          </p>
                        </div>

                        {canUpload && (
                          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger className="h-9 w-44 text-xs">
                                <SelectValue placeholder="Payment type" />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePaymentMethods.map((method) => (
                                  <SelectItem key={method.value} value={method.value}>
                                    {/* <span className="mr-1">{method.icon}</span> */}
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
            Scan this QR code to pay the owner commission
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
  const commissionRate = Math.round((payment?.commission_rate || 0) * 100)

  return (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-hidden border-slate-200 bg-white p-0 shadow-2xl shadow-slate-950/20 sm:max-w-5xl">
        <DialogClose className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80">
          <X className="h-4 w-4" />
        </DialogClose>
        <DialogHeader className="border-b border-slate-200 bg-slate-50 px-5 py-4 pr-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl text-slate-950">Payment Proof</DialogTitle>
                <DialogDescription className="mt-1 text-slate-500">
                  {payment ? `${bookingRef(payment.booking_id)}` : 'Payment proof'}
                </DialogDescription>
              </div>
            </div>
            {payment && <StatusBadge status={payment.status} type="payment" />}
          </div>
        </DialogHeader>

        {payment && (
          <div className="grid max-h-[calc(92vh-88px)] overflow-y-auto bg-white lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-h-[360px] items-center justify-center bg-slate-50 p-4 sm:min-h-[520px]">
              {payment.screenshot_url ? (
                <div className="flex h-full w-full items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img
                    src={payment.screenshot_url}
                    alt={`Payment proof for booking ${payment.booking_id}`}
                    className="max-h-[68vh] w-full rounded-lg object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <ReceiptText className="h-8 w-8" />
                  <p className="text-sm">No proof image available.</p>
                </div>
              )}
            </div>

            <div className="space-y-5 border-t border-slate-200 bg-slate-50/70 p-5 lg:border-l lg:border-t-0">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Amount submitted</p>
                <p className="mt-1 text-3xl font-semibold text-slate-950">{formatCurrency(payment.amount)}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {commissionRate}% commission
                  {payment.commission_amount ? ` · ${formatCurrency(payment.commission_amount)}` : ''}
                </p>
              </div>

              <div className="grid gap-3 text-sm">
                <PaymentProofDetail icon={<UserRound className="h-4 w-4" />} label="From" value={payment.transfer_from_name || 'Unknown'} />
                <PaymentProofDetail icon={<UserRound className="h-4 w-4" />} label="To" value={payment.transfer_to_name || 'Taxi Meik Swe Agency'} />
                <PaymentProofDetail icon={<CreditCard className="h-4 w-4" />} label="Method" value={payment.method || 'Not submitted'} />
                <PaymentProofDetail icon={<CalendarDays className="h-4 w-4" />} label="Paid" value={payment.paid_at ? formatDate(payment.paid_at) : 'Awaiting proof'} />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PaymentProofDetail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  )
}
