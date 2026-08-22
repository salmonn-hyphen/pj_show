import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Car, CalendarCheck, DollarSign, Clock,
  ShieldAlert, ShieldEllipsis, XCircle,
  ArrowRight, TrendingUp, User,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { ownersApi } from './ownerApi'
import { usersApi, carsApi } from '@/api'
import { useAuth } from '@/providers'
import { isKycApproved, normalizeVerificationStatus } from '@/constants'
import type { OwnerDashboardStats, User as UserType, Car as CarType } from '@/types'
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
  const { data: cars = [] } = useCachedFetch<CarType[]>('owner-cars', () => carsApi.getOwnerCars())

  const syncOwnerKycStatus = useCallback(async () => {
    if (!user) return

    try {
      const profile = await usersApi.getOwnerProfile()
      const nextStatus = normalizeVerificationStatus(profile.admin_approval_status)

      if (nextStatus !== user.verification_status) {
        updateUser({ ...user, verification_status: nextStatus as UserType['verification_status'] })
      }
    } catch {
      // Keep the cached user if the profile endpoint is unavailable.
    }
  }, [updateUser, user])

  useEffect(() => {
    syncOwnerKycStatus()
  }, [syncOwnerKycStatus])

  if (loading) return <LoadingSkeleton type="detail" count={3} />

  const monthlyEarnings = stats?.monthly_earnings || []
  const recentCars = cars.slice(0, 5)

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
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Earnings Overview</h2>
                <p className="text-xs text-muted-foreground">Your net earnings over recent months.</p>
              </div>
              <p className="text-lg font-semibold text-emerald-700">
                {formatCurrency(stats?.owner_net_earning ?? stats?.total_earnings ?? 0)}
              </p>
            </div>
            {monthlyEarnings.some((item) => item.amount > 0) ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyEarnings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                      width={44}
                    />
                    <Tooltip
                      cursor={{ fill: '#ecfdf5' }}
                      formatter={(value) => [formatCurrency(Number(value)), 'Earnings']}
                      labelClassName="text-xs text-slate-500"
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
                <TrendingUp className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-muted-foreground">No earnings yet. Earnings appear once rentals are completed.</p>
                <Link to="/owner/cars">
                  <Button size="sm" variant="outline" className="gap-1">
                    Post your first car <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Recent Bookings</h2>
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
                      <p className="text-xs text-muted-foreground truncate">
                        {booking.driver?.name ? (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" /> {booking.driver.name}
                          </span>
                        ) : (
                          formatDate(booking.start_date)
                        )}
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

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">My Cars</h2>
            <Link to="/owner/cars">
              <Button size="sm" variant="ghost" className="text gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          {recentCars.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentCars.map((car) => (
                <div key={car.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {car.brand} {car.model}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {car.year} · {car.city}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(car.daily_rate)}/day</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusBadge status={car.admin_approval_status || car.status} type="verification" />
                    {!car.is_available && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">Unavailable</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Car className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-muted-foreground">No cars posted yet.</p>
              <Link to="/owner/cars/new">
                <Button size="sm" variant="outline" className="gap-1">
                  Post your first car <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}