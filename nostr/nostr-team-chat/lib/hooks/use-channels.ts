import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Channel } from '@/lib/db/schema';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';

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

export function useChannel(channelId: string | null) {
  return useLiveQuery(
    () => {
      if (!channelId) return undefined;
      return db.channels.get(channelId);
    },
    [channelId],
    undefined
  );
}

// Helper function to fetch and sync channels for a workspace
export async function syncChannelsForWorkspace(workspaceId: string): Promise<void> {
  try {
    console.log('🔄 Syncing channels for workspace:', workspaceId);

    const client = getGlobalNIP29Client();
    if (!client.isConnected()) {
      await client.connect();
    }

    // Extract local group ID for querying
    const parts = workspaceId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : workspaceId;

    console.log('🔍 Fetching messages for localGroupId:', localGroupId);

    // Fetch all messages from the group to extract unique channel names
    const messages = await client.fetchEvents({
      kinds: [9], // GroupChatMessage
      '#h': [localGroupId],
      limit: 1000
    });

    console.log('📨 Found', messages.length, 'messages from relay');
    if (messages.length > 0) {
      console.log('📨 Sample message tags:', messages[0].tags);
      console.log('📨 Sample message content preview:', messages[0].content.substring(0, 50));
    }

    // Extract unique channel names from message 'c' tags
    const channelNames = new Set<string>();

    // Always include default channels
    channelNames.add('general');
    channelNames.add('random');

    // Extract channels from existing messages
    for (const message of messages) {
      const channelTag = message.tags.find(([tag]) => tag === 'c');
      if (channelTag && channelTag[1]) {
        console.log('📋 Found channel in message:', channelTag[1]);
        channelNames.add(channelTag[1]);
      }
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
