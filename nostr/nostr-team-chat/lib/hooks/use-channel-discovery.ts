import { useEffect, useRef, useCallback } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { db, type Channel } from '@/lib/db/schema';
import { NDKKind } from '@nostr-dev-kit/ndk';

/**
 * Hook that provides real-time channel discovery for a workspace.
 * 
 * This hook subscribes to kind: 9 (GroupChatMessage) events at the workspace level
 * and automatically discovers new channels when messages with new 'c' tags arrive.
 * 
 * This solves the problem where User A creates a channel and User B doesn't see it
 * until they refresh the page.
 */
export function useChannelDiscovery(workspaceId: string | null) {
  const { ndk, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const subscriptionRef = useRef<any>(null);
  const discoveredChannelsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  // Helper to get default channel description
  const getDefaultChannelDescription = useCallback((channelName: string): string => {
    switch (channelName) {
      case 'general':
        return 'General discussion';
      case 'random':
        return 'Random conversations';
      default:
        return `Discussion in #${channelName}`;
    }
  }, []);

  // Add a channel to the database if it doesn't exist
  const addChannelIfNew = useCallback(async (channelName: string, workspaceId: string) => {
    const channelId = `${workspaceId}-${channelName}`;
    
    // Skip if we've already processed this channel in this session
    if (discoveredChannelsRef.current.has(channelId)) {
      return;
    }

    try {
      // Check if channel already exists in the database
      const existingChannel = await db.channels.get(channelId);
      
      if (!existingChannel) {
        const now = Date.now();
        const newChannel: Channel = {
          id: channelId,
          workspaceId,
          name: channelName,
          description: getDefaultChannelDescription(channelName),
          createdAt: now,
          updatedAt: now,
        };

        await db.channels.add(newChannel);
        console.log('🆕 LIVE: Discovered and added new channel:', channelName);
      }

      // Mark as processed
      discoveredChannelsRef.current.add(channelId);
    } catch (error) {
      // Handle constraint errors gracefully (race condition with other tabs/instances)
      if (error instanceof Error && error.name === 'ConstraintError') {
        console.log('🔄 Channel already exists (race condition):', channelName);
        discoveredChannelsRef.current.add(channelId);
      } else {
        console.error('❌ Failed to add discovered channel:', error);
      }
    }
  }, [getDefaultChannelDescription]);

  // Initialize known channels from database
  const initializeKnownChannels = useCallback(async (workspaceId: string) => {
    try {
      const existingChannels = await db.channels
        .where('workspaceId')
        .equals(workspaceId)
        .toArray();
      
      // Pre-populate the discovered set with existing channels
      existingChannels.forEach(channel => {
        discoveredChannelsRef.current.add(channel.id);
      });

      console.log('📋 Initialized known channels:', existingChannels.length);
    } catch (error) {
      console.error('❌ Failed to initialize known channels:', error);
    }
  }, []);

  useEffect(() => {
    // Clear discovered channels when workspace changes
    discoveredChannelsRef.current.clear();
    isInitializedRef.current = false;

    // Validate prerequisites
    if (!ndk || !workspaceId || !pubkey) {
      console.log('⏭️ Channel discovery skipped: missing prerequisites', {
        hasNdk: !!ndk,
        hasWorkspaceId: !!workspaceId,
        hasPubkey: !!pubkey
      });
      return;
    }

    if (!ndk.signer) {
      console.log('⏭️ Channel discovery skipped: no signer attached');
      return;
    }

    if (!isConnected) {
      console.log('⏭️ Channel discovery skipped: not connected to relay');
      return;
    }

    console.log('🔍 Starting channel discovery for workspace:', workspaceId);

    // Start the discovery subscription
    const startDiscovery = async () => {
      try {
        // Initialize with existing channels first
        await initializeKnownChannels(workspaceId);
        isInitializedRef.current = true;

        // Create a live subscription for kind: 9 messages in this workspace
        // We use 'since: now' to only get new messages (not historical ones)
        const now = Math.floor(Date.now() / 1000);
        
        const filter = {
          kinds: [9] as NDKKind[], // GroupChatMessage
          '#h': [workspaceId], // Filter by workspace/group ID
          since: now - 60, // Start from 1 minute ago to catch any recent messages
        };

        console.log('📡 Channel discovery subscription filter:', filter);

        const subscription = ndk.subscribe(filter);
        subscriptionRef.current = subscription;

        subscription.on('event', (event: any) => {
          // Extract channel name from 'c' tag
          const channelTag = event.tags.find((tag: string[]) => tag[0] === 'c');
          const channelName = channelTag?.[1] || 'general';

          console.log('🔴 LIVE: Message received in channel:', channelName, {
            eventId: event.id?.slice(0, 8),
            workspaceId,
            author: event.pubkey?.slice(0, 8)
          });

          // Add channel if it's new
          addChannelIfNew(channelName, workspaceId);
        });

        subscription.on('eose', () => {
          console.log('✅ Channel discovery subscription ready (EOSE)');
        });

        subscription.on('close', () => {
          console.log('🔚 Channel discovery subscription closed');
        });

      } catch (error) {
        console.error('❌ Failed to start channel discovery:', error);
      }
    };

    startDiscovery();

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        console.log('🛑 Stopping channel discovery subscription');
        try {
          subscriptionRef.current.stop();
        } catch (error) {
          console.log('Error stopping channel discovery subscription:', error);
        }
        subscriptionRef.current = null;
      }
    };
  }, [ndk, workspaceId, pubkey, isConnected, initializeKnownChannels, addChannelIfNew]);

  return {
    isDiscovering: !!subscriptionRef.current,
    discoveredCount: discoveredChannelsRef.current.size,
  };
}

/**
 * Standalone function to manually trigger channel discovery for a workspace.
 * Useful for forcing a sync when entering a workspace.
 */
export async function discoverChannelsForWorkspace(
  ndk: any,
  workspaceId: string
): Promise<string[]> {
  if (!ndk || !workspaceId) {
    console.log('⏭️ Manual channel discovery skipped: missing prerequisites');
    return [];
  }

  try {
    console.log('🔍 Manual channel discovery for workspace:', workspaceId);

    // Fetch recent messages to discover channels
    const filter = {
      kinds: [9] as NDKKind[],
      '#h': [workspaceId],
      limit: 500, // Get enough messages to discover channels
    };

    const events = await ndk.fetchEvents(filter);
    const channelNames = new Set<string>();

    events.forEach((event: any) => {
      const channelTag = event.tags.find((tag: string[]) => tag[0] === 'c');
      const channelName = channelTag?.[1] || 'general';
      channelNames.add(channelName);
    });

    console.log('📋 Discovered channels:', Array.from(channelNames));

    // Add channels that don't exist yet
    const now = Date.now();
    for (const channelName of channelNames) {
      const channelId = `${workspaceId}-${channelName}`;
      const existing = await db.channels.get(channelId);
      
      if (!existing) {
        const newChannel: Channel = {
          id: channelId,
          workspaceId,
          name: channelName,
          description: channelName === 'general' 
            ? 'General discussion' 
            : `Discussion in #${channelName}`,
          createdAt: now,
          updatedAt: now,
        };

        try {
          await db.channels.add(newChannel);
          console.log('🆕 Added discovered channel:', channelName);
        } catch (error) {
          if (!(error instanceof Error && error.name === 'ConstraintError')) {
            console.error('❌ Failed to add channel:', channelName, error);
          }
        }
      }
    }

    return Array.from(channelNames);
  } catch (error) {
    console.error('❌ Manual channel discovery failed:', error);
    return [];
  }
}
