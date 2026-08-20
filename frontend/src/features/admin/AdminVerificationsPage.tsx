import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { adminApi } from '@/api'
import { useToast } from '@/providers'
import { formatDate } from '@/utils/format'
import {
  CheckCircle2, XCircle, Eye, User, Phone, Mail, Calendar,
  ShieldCheck, ShieldAlert, Clock, Loader2, ZoomIn, X,
  ChevronRight, History, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KYCDriver {
  id: string
  kycStatus: string
  nrcFrontUrl: string | null
  nrcBackUrl: string | null
  selfieUrl: string | null
  drivingLicenseFrontUrl: string | null
  drivingLicenseBackUrl: string | null
  nrcText: string | null
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    createdAt: string
  }
}

interface Props {
  type: 'owners' | 'drivers' | 'cars'
}

// ─── Shared Document Grid ─────────────────────────────────────────────────────
function DocumentGrid({ driver, onLightbox }: { driver: KYCDriver; onLightbox: (url: string) => void }) {
  const docs = [
    { label: 'NRC Front Side', url: driver.nrcFrontUrl },
    { label: 'NRC Back Side', url: driver.nrcBackUrl },
    { label: 'Selfie / Photo', url: driver.selfieUrl },
    { label: 'Driving License Front', url: driver.drivingLicenseFrontUrl },
    { label: 'Driving License Back', url: driver.drivingLicenseBackUrl },
  ]
  return (
    <div className="grid grid-cols-2 gap-4">
      {docs.map(({ label, url }) => (
        <div key={label} className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          {url ? (
            <div
              className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 group cursor-zoom-in"
              onClick={() => onLightbox(url)}
            >
              <img src={url} alt={label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 aspect-video flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Not uploaded</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Driver Info Strip ────────────────────────────────────────────────────────
function DriverInfoStrip({ driver }: { driver: KYCDriver }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="w-4 h-4 shrink-0" />
        <span className="font-medium text-foreground truncate">{driver.user.name}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Mail className="w-4 h-4 shrink-0" />
        <span className="truncate">{driver.user.email}</span>
      </div>
      {driver.user.phone && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-4 h-4 shrink-0" />
          <span>{driver.user.phone}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-4 h-4 shrink-0" />
        <span>Joined {formatDate(driver.user.createdAt)}</span>
      </div>
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function KycBadge({ status }: { status: string }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
      </span>
    )
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200/60">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50">
      <Clock className="w-3.5 h-3.5" /> Pending Review
    </span>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors" onClick={onClose}>
        <X className="w-8 h-8" />
      </button>
      <motion.img
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        src={url}
        alt="Document preview"
        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminVerificationsPage({ type }: Props) {
  const { addToast } = useToast()

  // Pending tab state
  const [pending, setPending] = useState<KYCDriver[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)

  // History tab state
  const [history, setHistory] = useState<KYCDriver[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyFetched, setHistoryFetched] = useState(false)

  // Shared modal state
  const [selectedDriver, setSelectedDriver] = useState<KYCDriver | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Other types state
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const title =
    type === 'owners' ? 'Owner Verifications' :
    type === 'drivers' ? 'Driver KYC Verifications' :
    'Car Verifications'

  const loadPending = useCallback(async () => {
    try {
      setPendingLoading(true)
      const data = await adminApi.getPendingDrivers()
      setPending(data || [])
    } catch {
      setPending([])
    } finally {
      setPendingLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const data = await adminApi.getKYCHistory()
      setHistory(data || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
      setHistoryFetched(true)
    }
  }, [])

  const loadOther = useCallback(async () => {
    try {
      setLoading(true)
      let data: any[]
      if (type === 'owners') data = await adminApi.getPendingOwners()
      else data = await adminApi.getPendingCars()
      setItems(data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    if (type === 'drivers') {
      loadPending()
    } else {
      loadOther()
    }
  }, [type, loadPending, loadOther])

  const openReview = (driver: KYCDriver, readOnly: boolean) => {
    setSelectedDriver(driver)
    setIsReadOnly(readOnly)
  }

  const handleApprove = async () => {
    if (!selectedDriver) return
    try {
      setProcessing(true)
      await adminApi.reviewDriverKYC(selectedDriver.id, 'APPROVED')
      addToast(`✅ ${selectedDriver.user.name}'s KYC has been approved.`, 'success')
      setPending((prev) => prev.filter((d) => d.id !== selectedDriver.id))
      setSelectedDriver(null)
      // Invalidate history cache so it refreshes next time
      setHistoryFetched(false)
    } catch {
      addToast('Failed to approve. Please try again.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!selectedDriver) return
    try {
      setProcessing(true)
      await adminApi.reviewDriverKYC(selectedDriver.id, 'REJECTED', rejectionReason || undefined)
      addToast(`❌ ${selectedDriver.user.name}'s KYC has been rejected.`, 'success')
      setPending((prev) => prev.filter((d) => d.id !== selectedDriver.id))
      setSelectedDriver(null)
      setShowRejectDialog(false)
      setRejectionReason('')
      setHistoryFetched(false)
    } catch {
      addToast('Failed to reject. Please try again.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleReviewOther = async (item: any, status: 'verified' | 'rejected') => {
    try {
      if (type === 'owners') {
        await adminApi.verifyOwner(item.id, status)
      } else if (type === 'cars') {
        await adminApi.verifyCar(item.id, status)
      }

      setItems((prev) => prev.filter((current) => current.id !== item.id))
      addToast(`${status === 'verified' ? 'Approved' : 'Rejected'} successfully.`, 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || `Failed to ${status === 'verified' ? 'approve' : 'reject'}.`, 'error')
    }
  }

  // ─── Non-driver type simple view ─────────────────────────────────────────
  if (type !== 'drivers') {
    if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">{title}</h1><LoadingSkeleton type="list" count={5} /></div>
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-slate-200">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mb-3" />
            <p className="font-semibold">All clear!</p>
            <p className="text-sm text-muted-foreground">No pending {type} verifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name || `${item.brand} ${item.model}`}</p>
                    <p className="text-sm text-muted-foreground">{item.email || item.city}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" onClick={() => handleReviewOther(item, 'verified')}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReviewOther(item, 'rejected')}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Driver KYC — Tabbed View ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage driver identity verification requests</p>
      </div>

      <Tabs defaultValue="pending" onValueChange={(tab) => {
        if (tab === 'history' && !historyFetched) loadHistory()
      }}>
        <TabsList className="mb-2">
          <TabsTrigger
            value="pending"
            className="gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Pending
            {pending.length > 0 && (
              <span className="ml-1 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold leading-none text-primary">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* ── Pending Tab ── */}
        <TabsContent value="pending">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={loadPending} disabled={pendingLoading}>
              Refresh
            </Button>
          </div>

          {pendingLoading ? (
            <LoadingSkeleton type="list" count={4} />
          ) : pending.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg">All clear!</p>
                  <p className="text-sm text-muted-foreground">No pending driver KYC verifications.</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {pending.map((driver) => (
                  <motion.div key={driver.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <Card
                      className="hover:shadow-md transition-shadow cursor-pointer border border-slate-100"
                      onClick={() => openReview(driver, false)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{driver.user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{driver.user.email}</p>
                              {driver.user.phone && <p className="text-xs text-muted-foreground">{driver.user.phone}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:flex flex-col items-end text-right">
                              <KycBadge status={driver.kycStatus} />
                              <p className="text-xs text-muted-foreground mt-1">Submitted {formatDate(driver.updatedAt)}</p>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Eye className="w-3.5 h-3.5" /> Review <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
              Refresh
            </Button>
          </div>

          {historyLoading ? (
            <LoadingSkeleton type="list" count={4} />
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
              <History className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <p className="font-semibold">No history yet</p>
                <p className="text-sm text-muted-foreground">Approved or rejected drivers will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((driver) => (
                <motion.div key={driver.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card
                    className="hover:shadow-md transition-shadow cursor-pointer border border-slate-100"
                    onClick={() => openReview(driver, true)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            driver.kycStatus === 'APPROVED'
                              ? "bg-emerald-100"
                              : "bg-red-100"
                          )}>
                            {driver.kycStatus === 'APPROVED'
                              ? <ShieldCheck className="w-5 h-5 text-emerald-600" />
                              : <ShieldAlert className="w-5 h-5 text-red-600" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{driver.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{driver.user.email}</p>
                            {driver.kycStatus === 'REJECTED' && driver.nrcText && (
                              <p className="text-xs text-red-500 mt-0.5 truncate">Reason: {driver.nrcText}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex flex-col items-end text-right">
                            <KycBadge status={driver.kycStatus} />
                            <p className="text-xs text-muted-foreground mt-1">
                              {driver.kycStatus === 'APPROVED' ? 'Approved' : 'Rejected'} {formatDate(driver.updatedAt)}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                            <Eye className="w-3.5 h-3.5" /> View <ChevronRight className="w-3.5 h-3.5" />
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

      {/* ─── KYC Review / Detail Modal ─────────────────────────────────────── */}
      <Dialog open={!!selectedDriver} onOpenChange={(o) => { if (!o) setSelectedDriver(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDriver && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {isReadOnly ? (
                    <>
                      <KycBadge status={selectedDriver.kycStatus} />
                      <span className="ml-1">KYC Record — {selectedDriver.user.name}</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-amber-500" />
                      KYC Review — {selectedDriver.user.name}
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {isReadOnly
                    ? 'Read-only view of the submitted documents and final decision.'
                    : 'Inspect the submitted identity documents, then approve or reject this driver.'}
                </DialogDescription>
              </DialogHeader>

              <DriverInfoStrip driver={selectedDriver} />

              {/* Rejection reason banner (history only) */}
              {isReadOnly && selectedDriver.kycStatus === 'REJECTED' && selectedDriver.nrcText && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200/60 text-sm">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700">Rejection Reason</p>
                    <p className="text-red-600 mt-0.5">{selectedDriver.nrcText}</p>
                  </div>
                </div>
              )}

              <DocumentGrid driver={selectedDriver} onLightbox={setLightboxUrl} />

              <DialogFooter className="gap-2 pt-2">
                {isReadOnly ? (
                  <Button variant="outline" className="text-black" onClick={() => setSelectedDriver(null)}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setSelectedDriver(null)} disabled={processing}>
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={processing}
                      className="gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={processing}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {processing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                        : <><CheckCircle2 className="w-4 h-4" /> Approve</>
                      }
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reject Reason Dialog ──────────────────────────────────────────── */}
      <Dialog open={showRejectDialog} onOpenChange={(o) => { if (!o) { setShowRejectDialog(false); setRejectionReason('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" /> Reject KYC Submission
            </DialogTitle>
            <DialogDescription>
              Optionally provide a short reason for rejection. The driver will need to re-upload their documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              className={cn(
                "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                "ring-offset-background placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "resize-none h-24"
              )}
              placeholder="e.g. Images are blurry or document has expired..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason('') }} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={processing} className="gap-2">
              {processing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting...</>
                : <><XCircle className="w-4 h-4" /> Confirm Reject</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      </AnimatePresence>
    </div>
  )
}
