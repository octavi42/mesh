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

    // For now, we'll create default channels if none exist
    // In a full implementation, you'd fetch from relay
    const existingChannels = await db.channels.where('workspaceId').equals(workspaceId).toArray();

    if (existingChannels.length === 0) {
      console.log('📝 Creating default channels for workspace:', workspaceId);

      const defaultChannels: Channel[] = [
        {
          id: `channel-${Date.now()}`,
          workspaceId,
          name: 'general',
          description: 'General discussion',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: `channel-${Date.now() + 1}`,
          workspaceId,
          name: 'random',
          description: 'Random conversations',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      await db.channels.bulkAdd(defaultChannels);
      console.log('✅ Created', defaultChannels.length, 'default channels');
    } else {
      console.log('ℹ️ Found', existingChannels.length, 'existing channels');
    }
  } catch (error) {
    console.error('❌ Failed to sync channels:', error);
  }
}
