'use client';

import { useState, useEffect } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, MessageSquare, UserPlus, AtSign, Check, XIcon, Trash2 } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { acceptRelayInvite, getInviteByCode, markInviteSeen, deleteInvite } from '@/lib/nostr/invites';
import { forceRefreshWorkspaces } from '@/lib/hooks/use-nip29-workspaces';
import { useNDK } from '@/lib/hooks/use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { acceptInviteWithRetry, deleteInviteWithRetry, handleNotificationError } from '@/lib/utils/notification-utils';
import type { Notification } from '@/lib/db/schema';
import './notification-detail-sheet.css';

interface NotificationDetailSheetProps {
  trigger?: React.ReactNode;
  notification: Notification;
}

export function NotificationDetailSheet({ trigger, notification }: NotificationDetailSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const { deleteNotification, updateNotificationStatus, markAsRead } = useNotificationStore();
  const { ndk } = useNDK();
  const { pubkey } = useAuthStore();
  const { addWorkspace } = useWorkspaceStore();

  // Mark invite as seen when user views it
  useEffect(() => {
    const markAsSeen = async () => {
      if (notification.type === 'invite' && notification.data && pubkey) {
        const currentStatus = (notification as any).status;

        // Only publish seen event if not already seen (but do it for accepted/declined too!)
        if (currentStatus !== 'seen') {
          const { inviteCode, groupId } = notification.data;
          try {
            // Publish seen event to relay (even for accepted/declined invites)
            await markInviteSeen(groupId as string, inviteCode as string);
            // Update local status to 'seen'
            updateNotificationStatus(notification.id, 'seen');
            // Mark as read in UI
            markAsRead(notification.id);
            console.log('📧 Marked invite as seen and notification as read:', { inviteCode, groupId, previousStatus: currentStatus });
          } catch (error) {
            console.warn('Failed to mark invite as seen:', error);
          }
        } else {
          console.log('📧 Invite already marked as seen, skipping');
        }
      }
    };

    markAsSeen();
  }, [notification, pubkey, updateNotificationStatus]);

  // Handle accepting an invite
  const handleAcceptInvite = async () => {
    if (notification.type !== 'invite' || !notification.data) return;

    setIsProcessing(true);
    setActionStatus('idle');

    try {
      const { inviteCode, groupId } = notification.data;

      console.log('🎯 Accepting relay invite:', { inviteCode, groupId });

      // Show user that they need to approve the signing request
      setStatusMessage('Please approve the signing request in your Nostr extension (e.g., Alby)...');

      // Use retry logic for accepting invite
      await acceptInviteWithRetry(notification.id, async () => {
        // Add timeout to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Signing timeout - please check your Nostr extension and try again')), 45000)
        );

        const acceptPromise = acceptRelayInvite(groupId, inviteCode, 'Accepted invitation');
        const { eventId } = await Promise.race([acceptPromise, timeoutPromise]);
        console.log('✅ Join request sent successfully:', eventId);
      });

      // Only proceed with success actions if we got here without errors
      console.log('🔄 Forcing workspace refresh...');
      forceRefreshWorkspaces();

      setActionStatus('success');
      setStatusMessage(`Successfully joined workspace! The workspace should appear in your list shortly.`);

      // Remove the notification after a short delay to show the accepted status
      setTimeout(() => {
        deleteNotification(notification.id);
      }, 2000);

      // Force refresh workspaces without page reload
      setTimeout(() => {
        console.log('🔄 Refreshing workspace list...');
        // The workspace list should update automatically when forceRefreshWorkspaces() is called above
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to accept invite:', error);
      setActionStatus('error');

      const friendlyMessage = handleNotificationError(error as Error, 'accept invitation');
      setStatusMessage(friendlyMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle deleting a notification
  const handleDeleteNotification = async () => {
    if (notification.type !== 'invite' || !notification.data) return;

    setIsProcessing(true);

    try {
      const { inviteCode, groupId } = notification.data;

      // Use retry logic for deleting invite
      await deleteInviteWithRetry(notification.id, async () => {
        await deleteInvite(groupId as string, inviteCode as string);
      });

      setActionStatus('success');
      setStatusMessage('Invite deleted');

      // Remove the notification after showing the deleted status
      setTimeout(() => {
        deleteNotification(notification.id);
      }, 2000);

    } catch (error) {
      console.error('Failed to delete invite:', error);
      setActionStatus('error');

      const friendlyMessage = handleNotificationError(error as Error, 'delete invitation');
      setStatusMessage(friendlyMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Format timestamp
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

  const getIcon = () => {
    switch (notification.type) {
      case 'mention':
        return <AtSign className="w-6 h-6 text-blue-500" />;
      case 'message':
        return <MessageSquare className="w-6 h-6 text-green-500" />;
      case 'invite':
        return <UserPlus className="w-6 h-6 text-purple-500" />;
      default:
        return <MessageSquare className="w-6 h-6 text-gray-500 dark:text-gray-400" />;
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
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification</h2>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </Sheet.Trigger>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{notification.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                    <p className="text-xs text-gray-400">{formatTime(notification.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Type</span>
                        <span className="text-gray-900 capitalize">{notification.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                        <span className="text-gray-900 dark:text-white">{notification.read ? 'Read' : 'Unread'}</span>
                      </div>
                      {notification.type === 'invite' && (notification as any).status && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Invite Status</span>
                          <span className={`font-medium ${
                            (notification as any).status === 'accepted'
                              ? 'text-green-600'
                              : 'text-yellow-600'
                          }`}>
                            {(notification as any).status === 'accepted' && 'Accepted'}
                            {((notification as any).status === 'pending' || (notification as any).status === 'seen') && 'Pending'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Time</span>
                        <span className="text-gray-900 dark:text-white">{formatTime(notification.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Message */}
                  {actionStatus !== 'idle' && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${
                      actionStatus === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {actionStatus === 'success' ? (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <XIcon className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="text-xs">{statusMessage}</span>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Actions</h4>
                    <div className="space-y-2">
                      {notification.type === 'invite' && (
                        <>
                          <button
                            onClick={handleAcceptInvite}
                            disabled={isProcessing || (notification as any).status === 'accepted'}
                            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                              </>
                            ) : (notification as any).status === 'accepted' ? (
                              <>
                                <Check className="w-4 h-4" />
                                Already Accepted
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Accept Invitation
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleDeleteNotification}
                            disabled={isProcessing || (notification as any).status === 'accepted'}
                            className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {(notification as any).status === 'deleted' ? (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Already Deleted
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Delete Notification
                              </>
                            )}
                          </button>
                        </>
                      )}
                      {notification.type === 'mention' && (
                        <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                          View in Channel
                        </button>
                      )}
                      {notification.type === 'message' && (
                        <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                          View Message
                        </button>
                      )}
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
