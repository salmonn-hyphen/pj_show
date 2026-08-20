import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { disputesApi } from '@/api'
import type { Dispute } from '@/types'
import { formatDate, bookingRef } from '@/utils/format'
import { AlertTriangle, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DriverDisputesPage() {
  const navigate = useNavigate()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    disputesApi.getAll().then(setDisputes).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton type="list" />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disputes</h1>
      {disputes.length === 0 ? (
        <EmptyState title="No disputes" description="If you have an issue with a booking, you can raise a dispute." />
      ) : (
        <div className="grid gap-3">
          {disputes.map((dispute) => (
            <motion.div key={dispute.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0"><AlertTriangle className="w-5 h-5" /></div>
                      <div>
                        <p className="font-medium">{bookingRef(dispute.booking_id)}</p>
                        <p className="text-sm text-muted-foreground mt-1">{dispute.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(dispute.created_at)}</p>
                      </div>
                    </div>
                    <StatusBadge status={dispute.status} type="dispute" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
