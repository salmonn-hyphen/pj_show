import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { disputesApi } from '@/api'
import { useToast } from '@/providers'
import type { Dispute } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import { AlertTriangle, Scale } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminDisputesPage() {
  const { addToast } = useToast()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<number | null>(null)
  const [resolution, setResolution] = useState('')
  const [deduction, setDeduction] = useState('')

  useEffect(() => {
    loadDisputes()
  }, [])

  const loadDisputes = async () => {
    try {
      const data = await disputesApi.getAll()
      setDisputes(data)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (id: number) => {
    if (!resolution) return
    try {
      setResolving(id)
      await disputesApi.resolve(id, {
        resolution,
        deposit_deduction: deduction ? Number(deduction) : undefined,
      })
      addToast('Dispute resolved', 'success')
      setResolution('')
      setDeduction('')
      setResolving(null)
      loadDisputes()
    } catch {
      addToast('Failed to resolve', 'error')
      setResolving(null)
    }
  }

  if (loading) return <LoadingSkeleton type="list" count={5} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dispute Management</h1>
      {disputes.length === 0 ? (
        <EmptyState title="No disputes" description="All disputes have been resolved." />
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <motion.div key={dispute.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0"><AlertTriangle className="w-5 h-5" /></div>
                      <div>
                        <p className="font-medium">Dispute on {bookingRef(dispute.booking_id)}</p>
                        <p className="text-sm text-muted-foreground mt-1">{dispute.reason}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                          <span>Raised by: {dispute.raiser?.name || 'N/A'}</span>
                          <span>Against: {dispute.target?.name || 'N/A'}</span>
                          <span>{formatDate(dispute.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={dispute.status} type="dispute" />
                  </div>

                  {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2"><Scale className="w-4 h-4" /> Resolve Dispute</h4>
                      <div className="space-y-2">
                        <Label className="text-xs">Resolution Notes</Label>
                        <textarea
                          rows={2}
                          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Enter resolution details..."
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Deposit Deduction (MMK)</Label>
                          <Input type="number" placeholder="0" value={deduction} onChange={(e) => setDeduction(e.target.value)} className="w-40" />
                        </div>
                        <Button onClick={() => handleResolve(dispute.id)} disabled={!resolution || resolving === dispute.id}>
                          {resolving === dispute.id ? 'Resolving...' : 'Resolve Dispute'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {dispute.resolution && (
                    <div className="border-t pt-3">
                      <p className="text-sm"><span className="font-medium">Resolution:</span> {dispute.resolution}</p>
                      {dispute.deposit_deduction !== null && (
                        <p className="text-sm text-red-600 mt-1">Deposit Deducted: {formatCurrency(dispute.deposit_deduction)}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
