import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarCheck, Car, CreditCard, FileCheck, MessageSquare, User,
  ShieldAlert, ShieldEllipsis, XCircle,
  ArrowRight, Clock, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/shared/StatsCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { usersApi } from '@/api'
import { driversApi } from './driverApi'
import { useAuth } from '@/providers'
import { isKycApproved, normalizeVerificationStatus } from '@/constants'
import { formatCurrency, formatDate } from '@/utils/format'
import type { DriverDashboardStats, Car as CarType } from '@/types'

const featureCards = [
  {
    title: 'Browse verified cars',
    description: 'Search approved cars by brand, model, city, and pickup location.',
    path: '/driver/cars',
    action: 'Browse Cars',
    icon: Car,
  },
  {
    title: 'Send rental requests',
    description: 'Apply to rent available cars and wait for owner/admin approval.',
    path: '/driver/bookings',
    action: 'My Booking',
    icon: CalendarCheck,
  },
  {
    title: 'Manage payments',
    description: 'Upload payment proof and follow payment confirmation status.',
    path: '/driver/payments',
    action: 'Payments',
    icon: CreditCard,
  },
  {
    title: 'Complete KYC',
    description: 'Submit NRC, selfie, and driving license documents for verification.',
    path: '/driver/documents',
    action: 'KYC',
    icon: FileCheck,
  },
  {
    title: 'Stay notified',
    description: 'Receive updates for bookings, agreements, payments, and admin decisions.',
    path: '/driver/notifications',
    action: 'Notifications',
    icon: MessageSquare,
  },
  {
    title: 'Update profile',
    description: 'Keep your phone, name, and account details current.',
    path: '/driver/profile',
    action: 'Profile',
    icon: User,
  },
]

function KYCAlert({ status }: { status: string }) {
  const normalizedStatus = normalizeVerificationStatus(status)
  if (isKycApproved(normalizedStatus)) return null

  const config: Record<string, { icon: React.ReactNode; color: string; title: string; desc: string }> = {
    unverified: {
      icon: <ShieldAlert className="w-5 h-5" />,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      title: 'KYC Verification Required',
      desc: 'Please upload your documents to start booking cars.',
    },
    pending: {
      icon: <ShieldEllipsis className="w-5 h-5" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      title: 'KYC Under Review',
      desc: 'Your documents are being reviewed.',
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
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-4 flex items-start gap-3 ${c.color}`}>
      <div className="shrink-0 mt-0.5">{c.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{c.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{c.desc}</p>
        <Link to="/driver/documents">
          <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-xs font-medium">
            Go to KYC <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

export function DriverDashboardPage() {
  const { user } = useAuth()
  const [kycStatus, setKycStatus] = useState(user?.verification_status || 'unverified')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DriverDashboardStats | null>(null)

  useEffect(() => {
    setKycStatus(user?.verification_status || 'unverified')
  }, [user?.verification_status])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        const [kycRes, dashboardRes] = await Promise.all([
          usersApi.getKycStatus(),
          driversApi.getDashboard(),
        ])

        setKycStatus(kycRes?.kycStatus || user?.verification_status || 'unverified')
        setStats(dashboardRes)
      } catch {
        setKycStatus(user?.verification_status || 'unverified')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [user?.verification_status])

  if (loading) return <LoadingSkeleton type="detail" count={3} />

  const kycPassed = isKycApproved(kycStatus)
  const recentBookings = stats?.recent_bookings || []
  const recommendedCars = stats?.recommended_cars || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, {user?.name?.split(' ')[0] || 'Driver'}
        </p>
      </div>

      {user && <KYCAlert status={kycStatus} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatsCard
          title="Active Bookings"
          value={stats?.active_bookings ?? 0}
          icon={<CalendarCheck className="w-5 h-5" />}
          description="Currently renting"
        />
        <StatsCard
          title="Completed"
          value={stats?.completed_bookings ?? 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          description="Total completed rentals"
        />
        <StatsCard
          title="Pending"
          value={stats?.pending_bookings ?? 0}
          icon={<Clock className="w-5 h-5" />}
          description="Awaiting approval"
        />
        <StatsCard
          title="KYC Status"
          value={kycPassed ? 'Verified' : 'Pending'}
          icon={<FileCheck className="w-5 h-5" />}
          description={kycPassed ? 'Account ready' : 'Verification required'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Recent Bookings</h2>
              <Link to="/driver/bookings">
                <Button size="sm" variant="ghost" className="text gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {booking.car?.brand} {booking.car?.model}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
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

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Recommended Cars</h2>
              <Link to="/driver/cars">
                <Button size="sm" variant="ghost" className="text gap-1">
                  Browse All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {recommendedCars.length > 0 ? (
              <div className="space-y-3">
                {recommendedCars.slice(0, 3).map((car) => (
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
                    <Link to={`/driver/cars/${car.id}`}>
                      <Button size="sm" variant="outline" className="shrink-0">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No recommendations yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon
          const locked = !kycPassed && !['/driver/documents', '/driver/profile', '/driver/notifications'].includes(feature.path)

          return (
            <Card key={feature.path} className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col p-4 sm:p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{feature.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  {locked ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      KYC required
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Available
                    </span>
                  )}
                  <Link to={feature.path}>
                    <Button size="sm" variant="outline" className="gap-1">
                      {feature.action} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
