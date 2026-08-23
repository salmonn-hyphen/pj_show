import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Users, Car, DollarSign, CalendarCheck, Shield, CreditCard } from 'lucide-react'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { adminApi } from '@/api'
import { formatCurrency } from '@/utils/format'
import type { AdminDashboardStats } from '@/types'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await adminApi.getDashboardStats()
      setStats(data)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton type="detail" count={6} />

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Platform overview and management</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatsCard title="Total Users" value={stats?.total_users || 0} icon={<Users className="w-5 h-5" />} />
        <StatsCard title="Total Revenue" value={formatCurrency(stats?.total_revenue || 0)} icon={<DollarSign className="w-5 h-5" />} />
        <StatsCard title="Active Bookings" value={stats?.active_bookings || 0} icon={<CalendarCheck className="w-5 h-5" />} />
        <StatsCard title="Available Cars" value={stats?.available_cars || 0} icon={<Car className="w-5 h-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] sm:gap-6">
        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Revenue Overview</h2>
                <p className="text-xs text-muted-foreground">Platform revenue over recent months.</p>
              </div>
              <p className="text-lg font-semibold text-emerald-700">{formatCurrency(stats?.total_revenue || 0)}</p>
            </div>
            {stats?.revenue_chart && stats.revenue_chart.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenue_chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                      labelClassName="text-xs text-slate-500"
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 24px rgb(15 23 42 / 0.08)',
                      }}
                    />
                    <Bar dataKey="amount" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">User Growth</h2>
                <p className="text-xs text-muted-foreground">New owner & driver registrations.</p>
              </div>
              <p className="text-lg font-semibold text-blue-600">{stats?.total_users || 0} total</p>
            </div>
            {stats?.user_growth && stats.user_growth.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.user_growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      width={30}
                    />
                    <Tooltip
                      cursor={{ fill: '#eff6ff' }}
                      formatter={(value) => [value, 'Users']}
                      labelClassName="text-xs text-slate-500"
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 24px rgb(15 23 42 / 0.08)',
                      }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">No user data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 sm:p-6">
          <h2 className="font-semibold text-sm mb-4 text-slate-950">Admin Work Queue</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Owner Verifications', count: stats?.pending_owner_verifications, href: '/admin/verifications/owners', icon: <Shield className="h-4 w-4" /> },
            { label: 'Driver Verifications', count: stats?.pending_driver_verifications, href: '/admin/verifications/drivers', icon: <Users className="h-4 w-4" /> },
            { label: 'Car Verifications', count: stats?.pending_car_verifications, href: '/admin/verifications/cars', icon: <Car className="h-4 w-4" /> },
            { label: 'Pending Payments', count: stats?.pending_payment_approvals, href: '/admin/payments', icon: <CreditCard className="h-4 w-4" /> },
          ].map((action) => (
            <Link key={action.label} to={action.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    {action.icon}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{action.label}</p>
                </div>
                {(action.count ?? 0) > 0 && <Badge variant="destructive">{action.count}</Badge>}
              </div>
            </Link>
          ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
