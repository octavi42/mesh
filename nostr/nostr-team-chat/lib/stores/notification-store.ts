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
            console.log('⏳ Waiting for NDK initialization for notifications...');
            client = await waitForNDKInitialization(15000); // Increased timeout
            console.log('✅ NDK ready for notifications');
          } catch (error) {
            console.error('❌ NDK not ready for notifications:', error);
            set({ isLoading: false });
            return;
          }

          // Check if client has proper authentication capabilities
          const clientInstance = (client as any).ndkInstance;
          if (!clientInstance) {
            console.error('❌ NDK client missing NDK instance for notifications');
            set({ isLoading: false });
            return;
          }

          console.log('🔍 NDK state for notifications:', {
            hasSigner: !!clientInstance.signer,
            hasUser: !!clientInstance.user,
            relayCount: clientInstance.pool?.relays?.size || 0
          });

          // Connect if needed
          if (!client.isConnected()) {
            console.log('🔌 Client not connected, attempting to connect...');
            try {
              await client.connect();
              console.log('✅ Client connected successfully for notifications');
            } catch (connectError) {
              console.error('❌ Failed to connect client for notifications:', connectError);
              set({ isLoading: false });
              return;
            }
          } else {
            console.log('✅ Client already connected for notifications');
          }

          // Fetch invite events from the last X hours
          // The app publishes both Kind 9009 (actual invites) and Kind 1 (notification events)
          const since = Math.floor(Date.now() / 1000) - (hoursBack * 60 * 60);
          const filters = [
            {
              kinds: [9009], // KIND_GROUP_CREATE_INVITE_9009 - actual invite events
              '#p': [userPubkey], // Events that tag this user
              since: since
            },
            {
              kinds: [1], // Text notes used for invite notifications
              '#p': [userPubkey], // Events that tag this user
              '#t': ['invite'], // Must have invite tag
              since: since
            }
          ];

          console.log('📡 Fetching notifications with filters:', filters);
          console.log('📡 Looking for notifications since:', new Date(since * 1000).toISOString());

          let events;
          try {
            events = await client.fetchEvents(filters);
            console.log(`📨 Found ${events.length} notification events from relay`);

            // Log event details for debugging
            if (events.length > 0) {
              console.log('📨 Event details:', events.map(e => ({
                id: e.id,
                kind: e.kind,
                created_at: e.created_at,
                created_at_iso: new Date(e.created_at * 1000).toISOString(),
                pubkey: e.pubkey.slice(0, 8),
                tags: e.tags,
                content: e.content?.substring(0, 100)
              })));
            } else {
              console.log('📨 No events found. Debug info:', {
                userPubkey: userPubkey.slice(0, 8),
                since,
                sinceISO: new Date(since * 1000).toISOString(),
                hoursBack,
                filters
              });
            }
          } catch (fetchError) {
            console.error('❌ Failed to fetch notification events:', fetchError);
            set({ isLoading: false });
            return;
          }

          // Convert events to notifications
          const notifications: NotificationWithStatus[] = [];

          for (const event of events) {
            try {
              console.log('📨 Processing notification event:', { id: event.id, kind: event.kind, tags: event.tags });

              let inviteCode: string;
              let groupId: string;
              let workspaceName: string;
              let inviterName: string;
              let message: string;

              if (event.kind === 9009) {
                // Parse Kind 9009 invite events - these have invite details in tags, not content
                console.log('📨 Processing Kind 9009 invite event');

                // Extract invite details from tags (based on relay implementation)
                const inviteCodeTag = event.tags.find(tag => tag[0] === 'code');
                const groupIdTag = event.tags.find(tag => tag[0] === 'h'); // group hash
                const invitedUserTag = event.tags.find(tag => tag[0] === 'p');

                // Verify this invite is for our user
                if (!invitedUserTag || invitedUserTag[1] !== userPubkey) {
                  console.log('📨 Skipping invite not for this user:', invitedUserTag?.[1]);
                  continue;
                }

                inviteCode = inviteCodeTag?.[1] || 'unknown';
                const localGroupId = groupIdTag?.[1] || 'unknown';
                groupId = localGroupId !== 'unknown' ? `'${localGroupId}` : 'unknown';
                workspaceName = `Group ${localGroupId.slice(0, 8)}`; // Use group hash as fallback
                inviterName = 'Group Admin'; // We don't have inviter name from Kind 9009 events
                message = `You have been invited to join a workspace (code: ${inviteCode})`;

              } else if (event.kind === 1) {
                // Parse Kind 1 notification events - these have structured content
                console.log('📨 Processing Kind 1 notification event');

                let inviteData;
                try {
                  inviteData = JSON.parse(event.content);
                } catch (parseError) {
                  console.warn('📨 Failed to parse Kind 1 event content:', parseError);
                  continue;
                }

                // Verify this is an invite notification
                if (inviteData.type !== 'invite') {
                  console.log('📨 Skipping non-invite Kind 1 event');
                  continue;
                }

                // Extract invite details from parsed content and tags
                const inviteCodeTag = event.tags.find(tag => tag[0] === 'invite_code');
                const groupIdTag = event.tags.find(tag => tag[0] === 'group_id');

                inviteCode = inviteData.inviteCode || inviteCodeTag?.[1] || 'unknown';
                groupId = inviteData.fullGroupId || (groupIdTag ? `'${groupIdTag[1]}` : 'unknown');
                workspaceName = inviteData.workspaceName || inviteData.groupName || 'Unknown Workspace';
                inviterName = inviteData.inviterName || 'Someone';
                message = inviteData.message || `${inviterName} invited you to join ${workspaceName}`;

              } else {
                console.log('📨 Skipping unsupported event kind:', event.kind);
                continue;
              }

              // Fetch invite status from relay (with timeout to prevent hanging)
              let status: NotificationWithStatus['status'] = 'pending';
              try {
                if (inviteCode !== 'unknown' && groupId !== 'unknown') {
                  console.log(`📊 Fetching status for invite ${inviteCode}...`);

                  // Add timeout to prevent hanging
                  const statusPromise = getInviteStatus(groupId, inviteCode, userPubkey);
                  const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Status fetch timeout')), 5000)
                  );

                  status = await Promise.race([statusPromise, timeoutPromise]) as any;
                  console.log(`📊 Fetched status for invite ${inviteCode}:`, { status, groupId, userPubkey });
                } else {
                  console.log(`📊 Skipping status fetch for invite ${inviteCode} - missing data`);
                }
              } catch (error) {
                console.warn(`📊 Failed to fetch invite status for ${inviteCode}, using default:`, error?.message || error);
                status = 'pending'; // Default to pending if status fetch fails
              }

              // Skip notifications that have been deleted
              if (status === 'deleted') {
                console.log(`🗑️ Skipping deleted invite notification: ${inviteCode}`);
                continue;
              }

              // Create notification from parsed data
              const notification: NotificationWithStatus = {
                id: event.id, // Use event ID as notification ID
                userId: userPubkey,
                type: 'invite',
                title: 'Workspace Invitation',
                message,
                data: {
                  inviteCode,
                  groupId,
                  workspaceName,
                  inviterName,
                  inviterPubkey: event.pubkey
                },
                // Mark as read if status is "seen", otherwise unread
                read: status === 'seen',
                createdAt: event.created_at * 1000, // Convert to milliseconds
                status
              };

              notifications.push(notification);
              console.log('✅ Added notification to list:', {
                id: notification.id,
                inviteCode,
                workspaceName,
                status,
                message
              });
            } catch (error) {
              console.warn('❌ Failed to parse notification event:', event.id, error);
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