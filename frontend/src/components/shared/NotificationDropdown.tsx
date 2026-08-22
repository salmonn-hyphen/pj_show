import { useState, useEffect, useRef } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notificationsApi } from '@/api'
import type { Notification } from '@/types'
import { timeAgo } from '@/utils/format'
import { useAuth } from '@/providers'
import { useNavigate } from 'react-router-dom'
import { useCachedFetch, updateCache } from '@/hooks/useCachedFetch'

const REFRESH_INTERVAL_MS = 30_000

export function NotificationDropdown() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Shares the same cache key as the Notifications page so both stay in sync.
  const { data: notifications = [], refresh } = useCachedFetch<Notification[]>(
    'notifications',
    () => notificationsApi.getAll(),
    { ttlMs: REFRESH_INTERVAL_MS },
  )
  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  const handleMarkAsRead = async (id: string | number) => {
    updateCache<Notification[]>('notifications', (items) =>
      items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )

    try {
      await notificationsApi.markAsRead(id)
    } catch {
      updateCache<Notification[]>('notifications', (items) =>
        items.map((n) => (n.id === id ? { ...n, is_read: false } : n)),
      )
    }
  }

  const getNotificationPath = (notification: Notification) => {
    if (notification.type === 'agreement_sent') {
      const role = user?.role?.toLowerCase()
      const id = notification.related_id || ''
      if (role === 'owner') return `/owner/agreements/${id}`
      if (role === 'driver') return `/driver/agreements/${id}`
      if (role === 'admin') return `/admin/agreements/${id}`
    }

    if (notification.type?.startsWith('booking')) {
      const role = user?.role?.toLowerCase()
      if (role === 'owner') return '/owner/bookings'
      if (role === 'driver') return '/driver/bookings'
      if (role === 'admin') return '/admin/bookings'
    }

    return null
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id)
    }

    const path = getNotificationPath(notification)
    if (path) {
      setOpen(false)
      navigate(path)
    }
  }

  const handleMarkAllRead = async () => {
    updateCache<Notification[]>('notifications', (items) =>
      items.map((n) => ({ ...n, is_read: true })),
    )

    try {
      await notificationsApi.markAllAsRead()
    } catch {
      refresh()
    }
  }

  const handleDelete = async (id: string | number) => {
    updateCache<Notification[]>('notifications', (items) => items.filter((n) => n.id !== id))

    try {
      await notificationsApi.remove(id)
    } catch {
      refresh()
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-200 hover:bg-slate-800 hover:text-white"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl shadow-slate-950/25">
          <div className="flex items-center justify-between border-b border-slate-800 p-3">
            <h4 className="text-sm font-semibold text-slate-100">Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-slate-300 hover:text-white hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  className={`group relative w-full border-b border-slate-800 text-left transition-colors last:border-0 ${!notif.is_read ? 'bg-slate-900/80' : ''}`}
                >
                  <button
                    onClick={() => handleNotificationClick(notif)}
                    className="w-full p-3 pr-10 text-left transition-colors hover:bg-slate-900"
                  >
                    <p className="text-sm font-medium text-slate-100">{notif.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{notif.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{timeAgo(notif.created_at)}</p>
                  </button>
                  <button
                    onClick={() => handleDelete(notif.id)}
                    aria-label="Delete notification"
                    className="absolute right-2 top-2 rounded-md p-1 text-slate-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-slate-800 p-2">
            <button
              onClick={() => {
                setOpen(false)
                navigate(`/${user?.role?.toLowerCase() || 'admin'}/notifications`)
              }}
              className="w-full rounded-lg py-1.5 text-center text-xs text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
