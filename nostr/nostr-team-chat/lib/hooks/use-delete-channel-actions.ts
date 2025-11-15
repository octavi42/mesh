'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMessageStore } from '@/lib/stores/message-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { db } from '@/lib/db/schema';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';
import { deleteEventEvent } from '@/lib/nostr/nip29/events';

/**
 * Hook for deleting individual channels/chats within a workspace
 * Implements the relay pattern: delete all messages -> channel becomes "deleted"
 */
export function useDeleteChannelActions() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { pubkey } = useAuthStore();
  const { messages, clearChannelMessages } = useMessageStore();
  const { currentChannelId, setCurrentChannel } = useChatStore();
  const router = useRouter();

  /**
   * Delete all messages in a channel, effectively "deleting" the channel
   */
  const deleteChannel = async (channelId: string, channelName: string, workspaceId: string) => {
    if (isDeleting || !pubkey) {
      return;
    }

    setIsDeleting(true);
    const toastId = `delete-channel-${channelId}`;

    try {
      console.log('🗑️ Deleting channel:', { channelId, channelName, workspaceId });
      toast.loading(`Deleting #${channelName}...`, { id: toastId });

      // Get all messages in this channel
      const channelMessages = messages[channelId] || [];
      console.log('📨 Found', channelMessages.length, 'messages to delete');

      if (channelMessages.length === 0) {
        // No messages, just remove locally
        await removeChannelLocally(channelId);
        toast.success(`#${channelName} deleted`, { id: toastId });
        return;
      }

      // Extract local group ID for relay operations
      const parts = workspaceId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : workspaceId;

      // Get the NIP-29 client for proper authentication
      const client = getGlobalNIP29Client();

      // Delete messages in batches for better performance
      const batchSize = 5;
      let deletedCount = 0;

      for (let i = 0; i < channelMessages.length; i += batchSize) {
        const batch = channelMessages.slice(i, i + batchSize);

        const deletionPromises = batch.map(async (message) => {
          try {
            // Use the proper NIP-29 event creation function
            const deleteEvent = await deleteEventEvent(localGroupId, message.id);

            console.log('🗑️ SENDING deletion event:', {
              kind: deleteEvent.kind,
              tags: deleteEvent.tags,
              messageId: message.id.slice(0, 8),
              eventId: deleteEvent.id?.slice(0, 8)
            });

            await client.publishEvent(deleteEvent);
            deletedCount++;

          } catch (error) {
            console.error('❌ Failed to delete message:', message.id, error);
          }
        });

        await Promise.all(deletionPromises);

        // Update progress
        const progress = Math.round((deletedCount / channelMessages.length) * 100);
        toast.loading(`Deleting #${channelName}... ${progress}%`, { id: toastId });

        // Small delay between batches
        if (i + batchSize < channelMessages.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`✅ Deleted ${deletedCount}/${channelMessages.length} messages`);

      // Clean up locally immediately (don't wait for sync)
      await removeChannelLocally(channelId);

      // Also trigger immediate cleanup for this specific workspace
      const { removeEmptyChannelsFromWorkspace } = await import('./use-channels');
      await removeEmptyChannelsFromWorkspace(workspaceId, true); // true = immediate mode

      // Navigate away if this was the current channel
      if (currentChannelId === channelId) {
        await navigateAwayFromDeletedChannel(workspaceId, channelId);
      }

      toast.success(`#${channelName} deleted`, { id: toastId });

    } catch (error) {
      console.error('❌ Failed to delete channel:', error);
      toast.error(`Failed to delete channel`, { id: toastId });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Remove channel from local database and stores
   */
  const removeChannelLocally = async (channelId: string) => {
    try {
      // Get channel info before deletion for blacklist
      const channel = await db.channels.get(channelId);

      // Remove messages from local database
      await db.messages.where('channelId').equals(channelId).delete();

      // Remove channel from local database
      await db.channels.delete(channelId);

      // Add to deleted channels blacklist to prevent recreation
      if (channel) {
        await db.deletedChannels.put({
          id: channelId,
          workspaceId: channel.workspaceId,
          channelName: channel.name,
          deletedAt: Date.now()
        });
        console.log('🚫 Added channel to deletion blacklist:', channel.name);
      }

      // Clear from message store
      clearChannelMessages(channelId);

      console.log('✅ Local channel cleanup completed');
    } catch (error) {
      console.error('❌ Failed to remove channel locally:', error);
    }
  };

  /**
   * Navigate away from deleted channel to another channel in the workspace
   */
  const navigateAwayFromDeletedChannel = async (workspaceId: string, deletedChannelId: string) => {
    try {
      console.log('🧭 Navigating away from deleted channel:', deletedChannelId);

      // Get remaining channels in this workspace
      const remainingChannels = await db.channels
        .where('workspaceId')
        .equals(workspaceId)
        .and(channel => channel.id !== deletedChannelId)
        .toArray();

      if (remainingChannels.length > 0) {
        // Navigate to the first remaining channel
        const nextChannel = remainingChannels[0];
        console.log('🧭 Navigating to next available channel:', nextChannel.name);

        setCurrentChannel(nextChannel.id);
        router.push(`/app/w/${workspaceId}/c/${nextChannel.id}`);
      } else {
        // No more channels in workspace, go to workspace home
        console.log('🧭 No more channels, navigating to workspace home');
        setCurrentChannel('');
        router.push(`/app/w/${workspaceId}`);
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback to workspace home
      router.push(`/app/w/${workspaceId}`);
    }
  };

  return {
    deleteChannel,
    isDeleting,
  };
}