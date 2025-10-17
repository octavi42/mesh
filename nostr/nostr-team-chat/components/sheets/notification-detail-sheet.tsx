'use client';

import { Sheet } from '@silk-hq/components';
import { X, MessageSquare, UserPlus, AtSign } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import './notification-detail-sheet.css';

interface NotificationDetailSheetProps {
  trigger?: React.ReactNode;
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  };
}

export function NotificationDetailSheet({ trigger, notification }: NotificationDetailSheetProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'mention':
        return <AtSign className="w-6 h-6 text-blue-500" />;
      case 'message':
        return <MessageSquare className="w-6 h-6 text-green-500" />;
      case 'invite':
        return <UserPlus className="w-6 h-6 text-purple-500" />;
      default:
        return <MessageSquare className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>{trigger}</Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true} style={{ zIndex: 10001 }}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 10}px)`,
            }}
          />
          <Sheet.Content
            className="NotificationDetailSheet-content"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
          >
            <div className="NotificationDetailSheet-innerContent">
              <div className="p-8 flex-shrink-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Notification</h2>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </Sheet.Trigger>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{notification.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                    <p className="text-xs text-gray-400">{notification.time}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Type</span>
                        <span className="text-gray-900 capitalize">{notification.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className="text-gray-900">{notification.read ? 'Read' : 'Unread'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Time</span>
                        <span className="text-gray-900">{notification.time}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                        View in Channel
                      </button>
                      <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                        Mark as {notification.read ? 'Unread' : 'Read'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
