import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Channel } from '@/lib/db/schema';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';
import { waitForNDKInitialization } from '@/lib/nostr/ndk-relay-client';

export function useChannels(workspaceId: string | null) {
  return useLiveQuery(
    () => {
      if (!workspaceId) return [];
      return db.channels.where('workspaceId').equals(workspaceId).toArray();
    },
    [workspaceId],
    []
  );
}

// Force refresh channels for a workspace (useful after switching accounts)
export async function refreshChannelsForWorkspace(workspaceId: string): Promise<void> {
  try {
    console.log('🔄 Force refreshing channels for workspace:', workspaceId);
    await syncChannelsForWorkspace(workspaceId);
  } catch (error) {
    console.error('❌ Failed to refresh channels:', error);
  }
}

// Force refresh channels for all workspaces for the current user
export async function refreshAllChannelsForUser(): Promise<void> {
  try {
    console.log('🔄 Force refreshing all channels for current user');

    // Get all workspaces for the current user
    const workspaces = await db.workspaces ? await db.workspaces.toArray() : [];

    // Sync channels for each workspace
    for (const workspace of workspaces) {
      await syncChannelsForWorkspace(workspace.id);
    }

    console.log('✅ Refreshed channels for all workspaces');
  } catch (error) {
    console.error('❌ Failed to refresh all channels:', error);
  }
}

export function useChannel(channelId: string | null) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasAttemptedSync, setHasAttemptedSync] = React.useState(false);

  const channel = useLiveQuery(
    () => {
      if (!channelId) return undefined;
      try {
        return db.channels.get(channelId);
      } catch (error) {
        console.warn('Error fetching channel:', error);
        return undefined;
      }
    },
    [channelId],
    undefined
  );

  // Only show loading when we're actively syncing missing channels
  React.useEffect(() => {
    if (!channelId) {
      setIsLoading(false);
      setHasAttemptedSync(false);
      return;
    }

    // If we have a channel, we're definitely not loading
    if (channel) {
      setIsLoading(false);
      setHasAttemptedSync(true);
      return;
    }

    // If we already attempted sync for this channel, don't try again
    if (hasAttemptedSync) {
      setIsLoading(false);
      return;
    }

    // Only sync if we haven't tried yet and channel doesn't exist
    const workspaceId = channelId.split('-')[0];
    if (workspaceId && !hasAttemptedSync) {
      setIsLoading(true);
      setHasAttemptedSync(true); // Set immediately to prevent multiple attempts

      syncChannelsForWorkspace(workspaceId)
        .then(() => {
          setIsLoading(false);
        })
        .catch((error) => {
          console.warn('Failed to sync channels:', error);
          setIsLoading(false);
        });
    }
  }, [channelId, channel, hasAttemptedSync]);

  // Reset sync attempt when channelId changes
  React.useEffect(() => {
    setHasAttemptedSync(false);
    setIsLoading(false);
  }, [channelId]);

  return { channel: channel || null, isLoading, hasAttemptedSync };
}

// Legacy hook for backward compatibility
export function useChannelData(channelId: string | null) {
  const result = useChannel(channelId);
  return result.channel;
}

// Helper function to fetch and sync channels for a workspace
export async function syncChannelsForWorkspace(workspaceId: string): Promise<void> {
  try {
    console.log('🔄 Syncing channels for workspace:', workspaceId);

    // Wait for NDK to be initialized before proceeding
    let client;
    try {
      client = await waitForNDKInitialization(8000);
      console.log('✅ NDK ready for channel sync');
    } catch (error) {
      console.log('⏳ NDK not ready for channel sync, skipping for now');
      return;
    }

    // Connect if needed
    if (!client.isConnected()) {
      await client.connect();
    }

    // Extract local group ID for querying
    const parts = workspaceId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : workspaceId;

    console.log('🔍 Fetching messages for localGroupId:', localGroupId);

    // Fetch all messages from the group to extract unique channel names
    // Increased limit to ensure we get more comprehensive channel discovery
    const messages = await client.fetchEvents({
      kinds: [9], // GroupChatMessage
      '#h': [localGroupId],
      limit: 2000 // Increased limit for better channel discovery
    });

    console.log('📨 Found', messages.length, 'messages from relay');

    // Extract unique channel names from message 'c' tags
    const channelNames = new Set<string>();

    // Extract channels from existing messages
    for (const message of messages) {
      const channelTag = message.tags.find(([tag]) => tag === 'c');
      if (channelTag && channelTag[1]) {
        console.log('📋 Found channel in message:', channelTag[1]);
        channelNames.add(channelTag[1]);
      }
    }

    // Also add a default 'general' channel if none exist yet
    if (channelNames.size === 0) {
      console.log('📋 No channels found, adding default general channel');
      channelNames.add('general');
    }

    console.log('📋 All discovered channels:', Array.from(channelNames));

    // Get existing channels from local DB
    const existingChannels = await db.channels.where('workspaceId').equals(workspaceId).toArray();
    const existingChannelNames = new Set(existingChannels.map(c => c.name));

    // Add missing channels to local DB
    const channelsToAdd: Channel[] = [];
    const now = Date.now();

    for (const channelName of channelNames) {
      if (!existingChannelNames.has(channelName)) {
        // Create deterministic IDs based on workspace and channel name
        const channelId = `${workspaceId}-${channelName}`;

        channelsToAdd.push({
          id: channelId,
          workspaceId,
          name: channelName,
          description: getDefaultChannelDescription(channelName),
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (channelsToAdd.length > 0) {
      await db.channels.bulkAdd(channelsToAdd);
      console.log('✅ Added', channelsToAdd.length, 'new channels:', channelsToAdd.map(c => c.name));
    }

    console.log('✅ Channel sync completed for workspace:', workspaceId);
  } catch (error) {
    console.error('❌ Failed to sync channels:', error);
  }
}

// Helper function to get default descriptions for channels
function getDefaultChannelDescription(channelName: string): string {
  switch (channelName) {
    case 'general':
      return 'General discussion';
    case 'random':
      return 'Random conversations';
    default:
      return `Discussion in #${channelName}`;
  }
}

// Helper function to remove empty channels (when all messages are deleted)
export async function removeEmptyChannel(channelId: string): Promise<void> {
  try {
    console.log('🗑️ Removing empty channel:', channelId);

    // Check if channel has any messages in the database
    const { db } = await import('@/lib/db/schema');
    const messageCount = await db.messages.where('channelId').equals(channelId).count();

    if (messageCount === 0) {
      // Channel is empty, remove it from database
      await db.channels.delete(channelId);
      console.log('✅ Removed empty channel:', channelId);
    } else {
      console.log('⏭️ Channel still has messages, not removing:', channelId, 'messageCount:', messageCount);
    }
  } catch (error) {
    console.error('❌ Failed to remove empty channel:', error);
  }
}
