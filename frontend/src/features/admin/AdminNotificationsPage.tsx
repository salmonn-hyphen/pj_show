import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { notificationsApi } from '@/api'
import type { Notification } from '@/types'
import { formatDateTime } from '@/utils/format'
import { useCachedFetch, updateCache } from '@/hooks/useCachedFetch'
import { Bell, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

const PAGE_SIZE = 10

export function AdminNotificationsPage() {
  const { data: notifications = [], isLoading: loading } = useCachedFetch<Notification[]>('notifications', () => notificationsApi.getAll())
  const [page, setPage] = useState(1)

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedNotifications = notifications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleMarkRead = async (id: string | number) => {
    const target = notifications.find((n) => n.id === id)
    if (!target || target.is_read) return

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

  const handleRemove = async (event: React.MouseEvent, id: string | number) => {
    event.stopPropagation()

    updateCache<Notification[]>('notifications', (items) => items.filter((n) => n.id !== id))

    try {
      await notificationsApi.remove(id)
    } catch {
      updateCache<Notification[]>('notifications', (items) => {
        const target = notifications.find((n) => n.id === id)
        return target ? [...items, target] : items
      })
    }
  }

  if (loading) return <LoadingSkeleton type="list" count={8} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" />
      ) : (
        <div className="space-y-2">
          {pagedNotifications.map((notif) => (
            <motion.div key={notif.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={`cursor-pointer overflow-hidden transition-colors ${
                  !notif.is_read ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
                onClick={() => handleMarkRead(notif.id)}
              >
                <CardContent className="flex p-0">
                  {!notif.is_read && <div className="w-1 shrink-0 bg-slate-950" />}
                  <div className="flex w-full items-start gap-3 p-4">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        !notif.is_read ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm font-semibold ${!notif.is_read ? 'text-slate-950' : 'text-slate-700'}`}>
                          {notif.title}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          {!notif.is_read && <span className="h-2 w-2 rounded-full bg-slate-950" />}
                          <button
                            type="button"
                            onClick={(event) => handleRemove(event, notif.id)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                            title="Remove notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{notif.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(notif.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Showing {notifications.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, notifications.length)} of {notifications.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-xs font-medium text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}