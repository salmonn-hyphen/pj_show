import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { depositsApi } from '@/api'
import type { Deposit } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import { Landmark } from 'lucide-react'

export function DriverDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    depositsApi.getMyDeposits().then(setDeposits).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSkeleton type="list" />
  if (deposits.length === 0) return <div className="space-y-6"><h1 className="text-2xl font-bold">Deposits</h1><EmptyState title="No deposits" description="Deposit history will appear here." /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Deposits</h1>
      <div className="grid gap-3">
        {deposits.map((deposit) => (
          <motion.div key={deposit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Landmark className="w-5 h-5" /></div>
                  <div>
                    <p className="font-medium">{formatCurrency(deposit.amount)}</p>
                    <p className="text-xs text-muted-foreground">{bookingRef(deposit.booking_id)} &middot; {formatDate(deposit.paid_at)}</p>
                  </div>
                </div>
                <StatusBadge status={deposit.status} type="deposit" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
