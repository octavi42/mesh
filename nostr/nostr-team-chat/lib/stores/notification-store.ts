'use client';

import { create } from 'zustand';
import { type Notification } from '@/lib/db/schema';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29/client-transition';
import { waitForNDKInitialization } from '@/lib/nostr/ndk-relay-client';
import { getInviteStatus } from '@/lib/nostr/invites';

// Extend notification interface to include status
interface NotificationWithStatus extends Notification {
  status?: 'pending' | 'seen' | 'accepted' | 'declined' | 'deleted';
}

interface NotificationStore {
  notifications: NotificationWithStatus[];
  unreadCount: number;
  isLoading: boolean;
  lastFetchTime: number | null;

  // Actions
  fetchNotificationsFromRelay: (userPubkey: string, hoursBack?: number) => Promise<void>;
  addNotificationFromEvent: (eventId: string, notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAll: () => void;
  updateNotificationStatus: (notificationId: string, status: NotificationWithStatus['status']) => void;

  // Computed getters
  getUnreadNotifications: () => NotificationWithStatus[];
  getNotificationsByType: (type: Notification['type']) => NotificationWithStatus[];
}

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      lastFetchTime: null,

      fetchNotificationsFromRelay: async (userPubkey: string, hoursBack: number = 24) => {
        try {
          console.log('📱 Fetching notifications from relay for user:', userPubkey);
          set({ isLoading: true });

          // Wait for NDK to be initialized before proceeding
          let client;
          try {
            client = await waitForNDKInitialization(8000);
            console.log('✅ NDK ready for notifications');
          } catch (error) {
            console.log('⏳ NDK not ready for notifications, skipping for now');
            set({ isLoading: false });
            return;
          }

          // Connect if needed
          if (!client.isConnected()) {
            await client.connect();
          }

          // Fetch invite notification events from the last X hours
          const since = Math.floor(Date.now() / 1000) - (hoursBack * 60 * 60);
          const filter = {
            kinds: [1], // Text notes used for invite notifications
            '#p': [userPubkey], // Events that tag this user
            '#t': ['invite'], // Must have invite tag
            since: since
          };

          console.log('📡 Fetching notifications with filter:', filter);

          const events = await client.fetchEvents([filter]);
          console.log(`📨 Found ${events.length} notification events from relay`);

          // Convert events to notifications
          const notifications: NotificationWithStatus[] = [];

          for (const event of events) {
            try {
              // Parse the invite notification content
              const inviteData = JSON.parse(event.content);

              // Verify this is an invite notification
              if (inviteData.type !== 'invite') {
                continue;
              }

              // Extract invite details
              const inviteCodeTag = event.tags.find(tag => tag[0] === 'invite_code');
              const groupIdTag = event.tags.find(tag => tag[0] === 'group_id');

              const inviteCode = inviteData.inviteCode || inviteCodeTag?.[1] || 'unknown';
              const groupId = inviteData.fullGroupId || (groupIdTag ? `relay'${groupIdTag[1]}` : 'unknown');

              // Fetch invite status from relay
              let status: NotificationWithStatus['status'] = 'pending';
              try {
                if (inviteCode !== 'unknown' && groupId !== 'unknown') {
                  status = await getInviteStatus(groupId, inviteCode, userPubkey);
                  console.log(`📊 Fetched status for invite ${inviteCode}:`, { status, groupId, userPubkey });
                }
              } catch (error) {
                console.warn('Failed to fetch invite status:', error);
              }

              // Skip notifications that have been deleted
              if (status === 'deleted') {
                console.log(`🗑️ Skipping deleted invite notification: ${inviteCode}`);
                continue;
              }

              const notification: NotificationWithStatus = {
                id: event.id, // Use event ID as notification ID
                userId: userPubkey,
                type: 'invite',
                title: 'Workspace Invitation',
                message: inviteData.message || `You have been invited to join ${inviteData.workspaceName || 'a workspace'}`,
                data: {
                  inviteCode,
                  groupId,
                  workspaceName: inviteData.workspaceName || inviteData.groupName || 'Unknown Workspace',
                  inviterName: inviteData.inviterName || 'Someone',
                  inviterPubkey: event.pubkey
                },
                // Mark as read if status is "seen", otherwise unread
                read: status === 'seen',
                createdAt: event.created_at * 1000, // Convert to milliseconds
                status
              };

              notifications.push(notification);
            } catch (error) {
              console.warn('Failed to parse notification event:', event.id, error);
            }
          }

          // Sort by newest first
          notifications.sort((a, b) => b.createdAt - a.createdAt);

          const unreadCount = notifications.filter(n => !n.read).length;

          console.log('📱 Processed notifications from relay:', {
            total: notifications.length,
            unread: unreadCount,
            oldestEvent: notifications.length > 0 ? new Date(Math.min(...notifications.map(n => n.createdAt))).toISOString() : 'none',
            newestEvent: notifications.length > 0 ? new Date(Math.max(...notifications.map(n => n.createdAt))).toISOString() : 'none',
            notifications: notifications.map(n => ({ id: n.id, status: n.status, read: n.read, inviteCode: n.data?.inviteCode }))
          });

          set({
            notifications,
            unreadCount,
            isLoading: false,
            lastFetchTime: Date.now()
          });

        } catch (error) {
          console.error('❌ Failed to fetch notifications from relay:', error);
          set({ isLoading: false });
        }
      },

      addNotificationFromEvent: (eventId: string, notificationData) => {
        const currentNotifications = get().notifications;

        // Use eventId as the notification ID to prevent duplicates
        const existingNotification = currentNotifications.find(n => n.id === eventId);
        if (existingNotification) {
          console.log('📧 Notification with this event ID already exists in memory:', eventId);
          return;
        }

        const notification: NotificationWithStatus = {
          ...notificationData,
          id: eventId, // Use Nostr event ID as stable identifier
          createdAt: Date.now(),
          status: 'pending' // Default status for new notifications
        };

        // Update memory state only (no persistence)
        const newNotifications = [notification, ...currentNotifications];
        const unreadCount = newNotifications.filter(n => !n.read).length;

        set({
          notifications: newNotifications,
          unreadCount
        });

        console.log('📧 Added notification from event to memory:', { eventId, notification });
      },

      markAsRead: (notificationId: string) => {
        // Update memory state only (no persistence needed)
        const currentNotifications = get().notifications;
        const updatedNotifications = currentNotifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        const unreadCount = updatedNotifications.filter(n => !n.read).length;

        set({
          notifications: updatedNotifications,
          unreadCount
        });

        console.log('✅ Marked notification as read in memory:', notificationId);
      },

      markAllAsRead: () => {
        // Update memory state only (no persistence needed)
        const currentNotifications = get().notifications;
        const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));

        set({
          notifications: updatedNotifications,
          unreadCount: 0
        });

        console.log('✅ Marked all notifications as read in memory');
      },

      deleteNotification: (notificationId: string) => {
        // Update memory state only (no persistence needed)
        const currentNotifications = get().notifications;
        const filteredNotifications = currentNotifications.filter(n => n.id !== notificationId);
        const unreadCount = filteredNotifications.filter(n => !n.read).length;

        set({
          notifications: filteredNotifications,
          unreadCount
        });

        console.log('🗑️ Deleted notification from memory:', notificationId);
      },

      clearAll: () => {
        // Clear memory state only (no persistence needed)
        set({
          notifications: [],
          unreadCount: 0
        });

        console.log('🗑️ Cleared all notifications from memory');
      },

      updateNotificationStatus: (notificationId: string, status: NotificationWithStatus['status']) => {
        const currentNotifications = get().notifications;
        const updatedNotifications = currentNotifications.map(n => {
          if (n.id === notificationId) {
            // Update both status and read state based on new status
            const updatedNotification = {
              ...n,
              status,
              // Update read status: mark as read if seen, accepted, or declined
              read: status === 'seen' || status === 'accepted' || status === 'declined' || n.read
            };
            return updatedNotification;
          }
          return n;
        });

        const unreadCount = updatedNotifications.filter(n => !n.read).length;

        set({
          notifications: updatedNotifications,
          unreadCount
        });

        console.log('🔄 Updated notification status:', { notificationId, status, unreadCount });
      },

      getUnreadNotifications: () => {
        return (get().notifications || []).filter(n => !n.read);
      },

      getNotificationsByType: (type) => {
        return (get().notifications || []).filter(n => n.type === type);
      },
    }));

// Helper function to create invite notifications from Nostr events
export const createInviteNotificationFromEvent = (
  eventId: string,
  userId: string,
  inviteData: {
    workspaceName: string;
    inviterName: string;
    inviteCode: string;
    groupId: string;
  }
) => {
  const { addNotificationFromEvent } = useNotificationStore.getState();

  addNotificationFromEvent(eventId, {
    userId,
    type: 'invite',
    title: 'Workspace Invitation',
    message: `${inviteData.inviterName} invited you to join ${inviteData.workspaceName}`,
    data: {
      inviteCode: inviteData.inviteCode,
      groupId: inviteData.groupId,
      workspaceName: inviteData.workspaceName,
      inviterName: inviteData.inviterName,
    },
    read: false,
  });
};

// Helper function to create join request notifications from Nostr events
export const createJoinRequestNotificationFromEvent = (
  eventId: string,
  userId: string, // admin receiving the notification
  requestData: {
    workspaceName: string;
    requesterName: string;
    requesterPubkey: string;
    groupId: string;
  }
) => {
  const { addNotificationFromEvent } = useNotificationStore.getState();

  addNotificationFromEvent(eventId, {
    userId,
    type: 'join_request',
    title: 'Join Request',
    message: `${requestData.requesterName} wants to join ${requestData.workspaceName}`,
    data: {
      requesterPubkey: requestData.requesterPubkey,
      groupId: requestData.groupId,
      workspaceName: requestData.workspaceName,
      requesterName: requestData.requesterName,
    },
    read: false,
  });
};