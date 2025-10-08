"use client"

import { Sheet } from "@silk-hq/components"
import { X, LucideIcon } from "lucide-react"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useSession } from "@/lib/hooks/use-session"

type NotificationsSheetWrapperProps = {
  trigger: {
    icon: LucideIcon
    label: string
  }
  title: string
}

type Notification = {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

export function NotificationsSheetWrapper({ trigger, title }: NotificationsSheetWrapperProps) {
  const Icon = trigger.icon
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!session?.user?.id) return

    async function fetchNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching notifications:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
      } else {
        setNotifications(data || [])
      }
      setLoading(false)
    }

    fetchNotifications()

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Sheet.Root license="commercial" forComponent="closest">
      <Sheet.Trigger asChild>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="text-gray-900">{trigger.label}</span>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true}>
          <Sheet.Content
            className="bg-white rounded-2xl shadow-xl w-full flex flex-col overflow-hidden"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
            style={{ maxWidth: '400px', marginRight: '48px', marginTop: '48px', marginBottom: '48px', maxHeight: 'calc(100vh - 96px)' }}
          >
            <div className="p-8 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </Sheet.Trigger>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Loading...</div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        notification.read
                          ? 'bg-white border-gray-200 hover:bg-gray-50'
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 text-sm">{notification.title}</h3>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{formatTimestamp(notification.created_at)}</span>
                        <span className="text-xs text-gray-500 capitalize">{notification.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
