import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { depositsApi } from '@/api'
import { useToast } from '@/providers'
import type { Deposit } from '@/types'
import { formatDate, formatCurrency, bookingRef } from '@/utils/format'
import { Landmark, Snowflake, CheckCircle, MinusCircle } from 'lucide-react'

export function AdminDepositsPage() {
  const { addToast } = useToast()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | number | null>(null)

  useEffect(() => {
    loadDeposits()
  }, [])

  const loadDeposits = async () => {
    try {
      // In a real app, there would be an admin endpoint for all deposits
      const [driverDeposits, ownerDeposits] = await Promise.all([
        depositsApi.getMyDeposits().catch(() => []),
        depositsApi.getOwnerDeposits().catch(() => []),
      ])
      setDeposits([...driverDeposits, ...ownerDeposits])
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleFreeze = async (id: string | number) => {
    try {
      setProcessing(id)
      await depositsApi.freezeDeposit(id)
      addToast('Deposit frozen', 'success')
      loadDeposits()
    } catch {
      addToast('Failed', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleRelease = async (id: string | number) => {
    try {
      setProcessing(id)
      await depositsApi.releaseDeposit(id)
      addToast('Deposit released', 'success')
      loadDeposits()
    } catch {
      addToast('Failed', 'error')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <LoadingSkeleton type="list" count={5} />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Deposit Management</h1>
      {deposits.length === 0 ? (
        <EmptyState title="No deposits" />
      ) : (
        <div className="space-y-3">
          {deposits.map((deposit) => (
            <motion.div key={deposit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Landmark className="w-5 h-5" /></div>
                      <div>
                        <p className="font-medium">{formatCurrency(deposit.amount)}</p>
                        <p className="text-xs text-muted-foreground">{bookingRef(deposit.booking_id)} &middot; {formatDate(deposit.paid_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={deposit.status} type="deposit" />
                      {deposit.status === 'held' && (
                        <Button size="sm" variant="warning" onClick={() => handleFreeze(deposit.id)} disabled={processing === deposit.id}>
                          <Snowflake className="w-4 h-4 mr-1" /> Freeze
                        </Button>
                      )}
                      {deposit.status === 'frozen' && (
                        <Button size="sm" variant="success" onClick={() => handleRelease(deposit.id)} disabled={processing === deposit.id}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Release
                        </Button>
                      )}
                    </div>
                  </div>
                  {deposit.deducted_amount && (
                    <div className="mt-2 text-sm text-red-600">
                      Deducted: {formatCurrency(deposit.deducted_amount)}
                      {deposit.deduction_reason && <span className="text-muted-foreground ml-2">({deposit.deduction_reason})</span>}
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
