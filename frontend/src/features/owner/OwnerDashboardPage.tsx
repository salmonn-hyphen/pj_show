import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Car, CalendarCheck, DollarSign, Clock,
  ShieldAlert, ShieldEllipsis, XCircle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ownersApi } from './ownerApi'
import { usersApi } from '@/api'
import { useAuth } from '@/providers'
import { isKycApproved, normalizeVerificationStatus } from '@/constants'
import type { OwnerDashboardStats, User } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { useCachedFetch } from '@/hooks/useCachedFetch'

function KYCAlert({ status }: { status: string }) {
  const normalizedStatus = normalizeVerificationStatus(status)
  if (isKycApproved(normalizedStatus)) return null

  const config: Record<string, { icon: React.ReactNode; color: string; title: string; desc: string }> = {
    unverified: {
      icon: <ShieldAlert className="w-5 h-5" />,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      title: 'KYC Verification Required',
      desc: 'Please upload your documents to start posting cars and receiving bookings.',
    },
    pending: {
      icon: <ShieldEllipsis className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      title: 'KYC Under Review',
      desc: 'Your documents are being reviewed. You will be able to post cars once verified.',
    },
    rejected: {
      icon: <XCircle className="w-5 h-5" />,
      color: 'bg-red-50 border-red-200 text-red-800',
      title: 'KYC Verification Rejected',
      desc: 'Some documents were rejected. Please re-upload them.',
    },
  }

  const c = config[normalizedStatus] || config.unverified

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 flex items-start gap-3 ${c.color}`}
    >
      <div className="shrink-0 mt-0.5">{c.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{c.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{c.desc}</p>
        <Link to="/owner/documents">
          <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-xs font-medium">
            Go to KYC <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

export function OwnerDashboardPage() {
  const { user, updateUser } = useAuth()
  const { data: stats = null, isLoading: loading } = useCachedFetch<OwnerDashboardStats>('owner-dashboard', () => ownersApi.getDashboard())

  const syncOwnerKycStatus = useCallback(async () => {
    if (!user) return

    try {
      const profile = await usersApi.getOwnerProfile()
      const nextStatus = normalizeVerificationStatus(profile.admin_approval_status)

      if (nextStatus !== user.verification_status) {
        updateUser({ ...user, verification_status: nextStatus as User['verification_status'] })
      }
    } catch {
      // Keep the cached user if the profile endpoint is unavailable.
    }
  }, [updateUser, user])

  useEffect(() => {
    syncOwnerKycStatus()
  }, [syncOwnerKycStatus])

  if (loading) return <LoadingSkeleton type="detail" count={3} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, {user?.name?.split(' ')[0] || 'Owner'}
        </p>
      </div>

      {user && <KYCAlert status={user.verification_status} />}


      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatsCard
          title="Total Cars"
          value={stats?.total_cars ?? 0}
          icon={<Car className="w-5 h-5" />}
          description={`${stats?.verified_cars ?? 0} verified`}
        />
        <StatsCard
          title="Active Rentals"
          value={stats?.active_rentals ?? 0}
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatsCard
          title="Pending Bookings"
          value={stats?.pending_bookings ?? 0}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatsCard
          title="My Earnings"
          value={formatCurrency(stats?.owner_net_earning ?? stats?.total_earnings ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          description="From completed rentals"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] sm:gap-6">


        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Car History</h2>
              <Link to="/owner/bookings">
                <Button size="sm" variant="ghost" className="text gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {stats?.recent_bookings && stats.recent_bookings.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {booking.car?.brand} {booking.car?.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(booking.start_date)} 
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatCurrency(booking.total_amount)}</span>
                      <StatusBadge status={booking.status} type="booking" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent bookings</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
