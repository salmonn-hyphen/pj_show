import { DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/shared/StatsCard'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ownersApi } from './ownerApi'
import { formatCurrency } from '@/utils/format'
import { useCachedFetch } from '@/hooks/useCachedFetch'

export function OwnerEarningsPage() {
  const { data, isLoading: loading } = useCachedFetch<{ total: number; monthly: { month: string; amount: number }[] }>('owner-earnings', () => ownersApi.getEarnings())

  if (loading) return <LoadingSkeleton type="detail" />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Earnings</h1>
      <StatsCard title="Total Earnings" value={formatCurrency(data?.total || 0)} icon={<DollarSign className="w-5 h-5" />} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Monthly Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.monthly && data.monthly.length > 0 ? (
            <div className="space-y-3">
              {data.monthly.map((m) => (
                <div key={m.month} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{m.month}</span>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(m.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No earnings data available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
