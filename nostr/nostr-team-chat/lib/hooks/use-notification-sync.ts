'use client';

import { useEffect } from 'react';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29/client-transition';
import { getInviteStatus } from '@/lib/nostr/invites';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Hook to sync notification status with real-time relay events
 */
export function useNotificationSync() {
  const { pubkey } = useAuthStore();
  const { updateNotificationStatus, notifications } = useNotificationStore();

  useEffect(() => {
    if (!pubkey) {
      console.log('🔄 No pubkey available, skipping notification sync subscription');
      return;
    }

    const client = getGlobalNIP29Client();

    // Subscribe to invite state events that affect this user
    const subscribeToInviteStateUpdates = async () => {
      try {
        if (!client.isConnected()) {
          await client.connect();
        }

        console.log('🔄 Starting notification sync subscription for user:', pubkey);

        const filter = {
          kinds: [9021, 9023, 9024, 9025], // JOIN_REQUEST, DECLINE, SEEN, DELETE
          authors: [pubkey], // Only events from this user
          since: Math.floor(Date.now() / 1000) - 60 // Start from 1 minute ago
        };

        console.log('🔄 Subscribing to invite state updates with filter:', filter);

        const subscription = client.subscribe([filter], async (event) => {
          console.log('🔄 Received invite state event:', {
            kind: event.kind,
            id: event.id,
            tags: event.tags
          });

          try {
            // Extract invite details from event
            const inviteCodeTag = event.tags.find(t => t[0] === 'code');
            const groupIdTag = event.tags.find(t => t[0] === 'h');

            if (!inviteCodeTag || !groupIdTag) {
              console.warn('🔄 Invite state event missing required tags:', event.id);
              return;
            }

            const inviteCode = inviteCodeTag[1];
            const localGroupId = groupIdTag[1];

            // Find matching notification by invite code
            const matchingNotification = notifications.find(n =>
              n.type === 'invite' &&
              n.data?.inviteCode === inviteCode
            );

            if (matchingNotification) {
              console.log('🔄 Found matching notification for invite:', inviteCode);

              // Get the full group ID from the notification
              const fullGroupId = matchingNotification.data?.groupId as string;

              // Fetch updated status from relay
              const updatedStatus = await getInviteStatus(fullGroupId, inviteCode, pubkey);

              console.log('🔄 Updating notification status:', {
                notificationId: matchingNotification.id,
                inviteCode,
                oldStatus: (matchingNotification as any).status,
                newStatus: updatedStatus
              });

              // Update the notification status
              updateNotificationStatus(matchingNotification.id, updatedStatus);
            } else {
              console.log('🔄 No matching notification found for invite:', inviteCode);
            }
          } catch (error) {
            console.error('🔄 Error processing invite state event:', error);
          }
        });

        // Cleanup function
        return () => {
          console.log('🔄 Cleaning up notification sync subscription');
          if (subscription) {
            subscription.close?.();
          }
        };

      } catch (error) {
        console.error('🔄 Failed to set up notification sync subscription:', error);
      }
    };

    subscribeToInviteStateUpdates();

  }, [pubkey, updateNotificationStatus, notifications]);
}