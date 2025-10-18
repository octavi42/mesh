'use client';

import { useState, useRef } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, Bell } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import { NotificationDetailSheet } from './notification-detail-sheet';
import './notifications-sheet.css';

interface NotificationsSheetProps {
  trigger?: React.ReactNode;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function NotificationsSheet({ trigger }: NotificationsSheetProps) {
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const detailButtonRef = useRef<HTMLButtonElement>(null);
  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setTimeout(() => {
      detailButtonRef.current?.click();
    }, 50);
  };

  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'mention',
      title: 'Alice mentioned you',
      message: 'Hey @You, can you check this out?',
      time: '5 minutes ago',
      read: false,
    },
    {
      id: '2',
      type: 'message',
      title: 'New message in #general',
      message: 'Bob sent a message',
      time: '1 hour ago',
      read: false,
    },
    {
      id: '3',
      type: 'invite',
      title: 'Workspace invitation',
      message: 'Carol invited you to Design Team',
      time: '2 hours ago',
      read: true,
    },
  ];

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
                  </div>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </Sheet.Trigger>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="space-y-3">
                  {mockNotifications.map((notification) => (
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
                      <p className="text-xs text-gray-400">{notification.time}</p>
                    </div>
                  ))}
                </div>
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
