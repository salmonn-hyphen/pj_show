import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, CalendarCheck, Car,
  Users, Shield, Bell, ScrollText, DollarSign, Landmark,
  AlertTriangle, Menu, X, ChevronDown, Gauge,
  PlusCircle, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth, useRole } from '@/providers'
import { ScrollArea } from '@/components/ui/scroll-area'
import { APP_NAME, isKycApproved } from '@/constants'
import Logo from '@/assets/Logo.svg'

interface NavItem {
  label: string
  icon: React.ReactNode
  path?: string
  locked?: boolean
  children?: { label: string; path: string; icon?: React.ReactNode }[]
}

const ownerNav = (kycPassed: boolean): NavItem[] => [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/owner' },
  {
    label: 'My Cars',
    icon: <Car className="w-4 h-4" />,
    path: '/owner/cars',
    locked: !kycPassed,
    children: [
      { label: 'Posts', path: '/owner/cars', icon: <FileText className="h-3.5 w-3.5" /> },
      { label: 'Post Car', path: '/owner/cars/new', icon: <PlusCircle className="h-3.5 w-3.5" /> },
    ],
  },
  { label: 'Bookings', icon: <CalendarCheck className="w-4 h-4" />, path: '/owner/bookings', locked: !kycPassed },
  { label: 'Payments', icon: <DollarSign className="w-4 h-4" />, path: '/owner/payments', locked: !kycPassed },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/owner/notifications' },
  { label: 'Agreements', icon: <FileText className="w-4 h-4" />, path: '/owner/agreements' },
  { label: 'KYC', icon: <Shield className="w-4 h-4" />, path: '/owner/documents' },
  { label: 'Profile', icon: <Users className="w-4 h-4" />, path: '/owner/profile' },
]

const driverNav = (kycPassed: boolean): NavItem[] => [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/driver' },
  { label: 'Browse Cars', icon: <Car className="w-4 h-4" />, path: '/driver/cars' },
  { label: 'My Booking', icon: <CalendarCheck className="w-4 h-4" />, path: '/driver/bookings', locked: !kycPassed },
  { label: 'Payments', icon: <DollarSign className="w-4 h-4" />, path: '/driver/payments', locked: !kycPassed },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/driver/notifications' },
  { label: 'Agreements', icon: <FileText className="w-4 h-4" />, path: '/driver/agreements' },
  { label: 'KYC', icon: <Shield className="w-4 h-4" />, path: '/driver/documents' },
  { label: 'Profile', icon: <Users className="w-4 h-4" />, path: '/driver/profile' },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', icon: <Gauge className="w-4 h-4" />, path: '/admin' },
  { label: 'Verify Owners', icon: <Users className="w-4 h-4" />, path: '/admin/verifications/owners' },
  { label: 'Verify Drivers', icon: <Users className="w-4 h-4" />, path: '/admin/verifications/drivers' },
  { label: 'Verify Cars', icon: <Car className="w-4 h-4" />, path: '/admin/verifications/cars' },
  { label: 'Bookings', icon: <CalendarCheck className="w-4 h-4" />, path: '/admin/bookings' },
  { label: 'Payments', icon: <DollarSign className="w-4 h-4" />, path: '/admin/payments' },
  { label: 'Disputes', icon: <AlertTriangle className="w-4 h-4" />, path: '/admin/disputes' },
  { label: 'Users', icon: <Users className="w-4 h-4" />, path: '/admin/users' },
  { label: 'Deposits', icon: <Landmark className="w-4 h-4" />, path: '/admin/deposits' },
  { label: 'Notifications', icon: <Bell className="w-4 h-4" />, path: '/admin/notifications' },
  { label: 'Agreements', icon: <FileText className="w-4 h-4" />, path: '/admin/agreements' },
  { label: 'Audit Log', icon: <ScrollText className="w-4 h-4" />, path: '/admin/audit-log' },
]

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const { pathname } = useLocation()
  const { user, refreshUser } = useAuth()
  const { isOwner, isDriver, isAdmin } = useRole()

  const kycPassed = isKycApproved(user?.verification_status)
  const navItems = isAdmin ? adminNav : isOwner ? ownerNav(kycPassed) : isDriver ? driverNav(kycPassed) : []
  const linkedNavItems = navItems.filter((item): item is NavItem & { path: string } => Boolean(item.path))

  useEffect(() => {
    if ((isOwner || isDriver) && !kycPassed) {
      refreshUser().catch(() => {
        // Keep the current sidebar state if the session refresh fails.
      })
    }
  }, [isOwner, isDriver, kycPassed, refreshUser])

  const isNavItemActive = (itemPath: string) => {
    if (pathname === itemPath) return true

    if (itemPath === '/owner' || itemPath === '/driver' || itemPath === '/admin') {
      return false
    }

    return pathname.startsWith(`${itemPath}/`)
  }

  const isChildPathActive = (childPath: string) => {
    if (childPath === '/owner/cars') {
      return pathname === childPath || /^\/owner\/cars\/[^/]+\/edit$/.test(pathname)
    }

    return pathname === childPath || pathname.startsWith(`${childPath}/`)
  }

  const isChildActive = (children?: NavItem['children']) =>
    Boolean(children?.some((child) => isChildPathActive(child.path)))

  const isGroupOpen = (item: NavItem & { path: string }) =>
    Boolean(openGroups[item.path] ?? isNavItemActive(item.path) ?? isChildActive(item.children))

  const toggleGroup = (path: string) => {
    setOpenGroups((current) => ({ ...current, [path]: !current[path] }))
  }

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg border border-white/15 bg-slate-950 text-white shadow-lg transition hover:bg-slate-900"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/10 bg-slate-950 text-white shadow-[24px_0_80px_rgba(2,6,23,0.35)] transition-all duration-300',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center h-16 px-4 border-b border-white/10 justify-between gap-3">
          <Link to={navItems[0]?.path || '/'} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 shadow-lg shadow-amber-500/10">
              <img src={Logo} alt="" className="h-8 w-auto object-contain" />
            </span>
            <span className="truncate text-sm font-semibold text-white">{APP_NAME}</span>
          </Link>
        </div>

        <ScrollArea className="relative flex-1 py-3">
          <nav className="space-y-1.5 px-2">
            {linkedNavItems.map((item) => {
              const hasChildren = Boolean(item.children?.length)
              const active = !hasChildren && isNavItemActive(item.path) && !item.locked
              const groupOpen = hasChildren && isGroupOpen(item)

              return (
                <div key={item.path} className="space-y-1">
                  <div className="flex items-center gap-1">
                    <NavLink
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={() =>
                        cn(
                          'group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                          active
                            ? 'bg-amber-400/15 text-amber-200 font-medium shadow-inner shadow-amber-500/10 ring-1 ring-amber-300/20'
                            : 'text-white/65 hover:bg-white/10 hover:text-white',
                          item.locked && 'opacity-45 hover:bg-transparent hover:text-white/65',
                        )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                          active
                            ? 'bg-amber-400/20 text-amber-300'
                            : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white',
                        )}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.locked && <Lock className="ml-auto h-3 w-3 shrink-0 text-white/50" />}
                    </NavLink>

                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.path)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                        aria-label={`${groupOpen ? 'Collapse' : 'Expand'} ${item.label}`}
                      >
                        <ChevronDown className={cn('h-4 w-4 transition-transform', groupOpen && 'rotate-180')} />
                      </button>
                    )}
                  </div>

                  {hasChildren && groupOpen && (
                    <div className="ml-10 space-y-1 border-l border-white/10 pl-3">
                      {item.children?.map((child) => {
                        const childActive = isChildPathActive(child.path) && !item.locked

                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
                              childActive
                                ? 'bg-amber-400/10 text-amber-200 font-medium'
                                : 'text-white/55 hover:bg-white/10 hover:text-white',
                              item.locked && 'opacity-45 hover:bg-transparent hover:text-white/55',
                            )}
                          >
                            {child.icon || <PlusCircle className="h-3.5 w-3.5" />}
                            <span>{child.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </ScrollArea>

      </aside>
    </>
  )
}
