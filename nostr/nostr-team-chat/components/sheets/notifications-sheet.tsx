'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, Bell } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import { NotificationDetailSheet } from './notification-detail-sheet';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Notification } from '@/lib/db/schema';
import './notifications-sheet.css';

interface NotificationsSheetProps {
  trigger?: React.ReactNode;
}

export function NotificationsSheet({ trigger }: NotificationsSheetProps) {
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const detailButtonRef = useRef<HTMLButtonElement>(null);

  const { pubkey } = useAuthStore();
  const {
    notifications,
    isLoading,
    loadNotifications,
    markAsRead
  } = useNotificationStore();

  // Load notifications when component mounts
  useEffect(() => {
    if (pubkey) {
      loadNotifications();
    }
  }, [pubkey, loadNotifications]);

  // Filter notifications for current user
  const userNotifications = notifications?.filter(n => n.userId === pubkey) || [];
  const displayNotifications = showAllNotifications ? (notifications || []) : userNotifications;

  // Debug logging
  console.log('🔔 Notifications debug:', {
    currentUserPubkey: pubkey,
    totalNotifications: notifications?.length || 0,
    userNotifications: userNotifications.length,
    showingAll: showAllNotifications,
    displayCount: displayNotifications.length,
    allNotifications: notifications?.map(n => ({ userId: n.userId, type: n.type, title: n.title }))
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    setSelectedNotification(notification);
    setTimeout(() => {
      detailButtonRef.current?.click();
    }, 50);
  };

  // Helper function to format time
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else {
      return `${days} days ago`;
    }
  };

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>{trigger}</Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true} style={{ zIndex: 10000 }}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 10}px)`,
            }}
          />
          <Sheet.Content
            className="NotificationsSheet-content"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
          >
            <div className="NotificationsSheet-innerContent">
              <div className="p-8 flex-shrink-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      {userNotifications.length} / {notifications?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAllNotifications(!showAllNotifications)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition-colors"
                    >
                      {showAllNotifications ? 'Show Mine' : 'Show All'}
                    </button>
                    <Sheet.Trigger action="dismiss" asChild>
                      <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </Sheet.Trigger>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : displayNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-sm font-medium text-gray-500 mb-1">No notifications</h3>
                    <p className="text-xs text-gray-400">You&apos;re all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                          notification.read
                            ? 'bg-white border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-400">{formatTime(notification.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Sheet.Content>
          {selectedNotification && (
            <NotificationDetailSheet
              notification={selectedNotification}
              trigger={
                <button
                  ref={detailButtonRef}
                  style={{ display: 'none' }}
                />
              }
            />
          )}
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
