import { useEffect, useRef } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { NDKKind } from '@nostr-dev-kit/ndk';
import type { Workspace } from '@/lib/stores/workspace-store-clean';
import { parseGroupMetadata } from '@/lib/nostr/nip29/utils';

// Real-time workspace synchronization - follows the same pattern as message sync
// This ensures workspaces are always up-to-date across accounts and devices

// Track active subscriptions per user to avoid duplicates
const activeSubscriptions = new Map<string, string>();

// Function to force refresh workspaces (for debugging deleted groups)
export function forceRefreshWorkspaces() {
  console.log('🔄 Forcing workspace refresh - clearing cache and refetching');

  // Clear the workspace store
  const store = useWorkspaceStore.getState();
  store.setWorkspaces([]);

  console.log('✅ Workspace cache cleared, will refetch on next component mount');
}

// Function to clear active subscription for a specific user (on logout)
export function clearUserSubscription(userKey: string) {
  if (activeSubscriptions.has(userKey)) {
    activeSubscriptions.delete(userKey);
    console.log('🧹 Cleared workspace subscription for user:', userKey);
  }
}

export function useNIP29Workspaces() {
  const { ndk, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const { addWorkspace, setLoading, setError, workspaces, setWorkspaces } = useWorkspaceStore();
  const subscriptionActiveRef = useRef(true);

  useEffect(() => {
    console.log('🔍 useNIP29Workspaces effect triggered:', {
      hasNdk: !!ndk,
      hasPubkey: !!pubkey,
      isConnected,
      pubkey: pubkey?.slice(0, 8),
      existingWorkspaces: workspaces.length
    });

    if (!ndk || !pubkey) {
      console.log('⏭️ Skipping NIP-29 workspace subscription: missing basic requirements');
      return;
    }

    // Check if we have a signer (required for authenticated access)
    if (!ndk.signer) {
      console.log('⏭️ Skipping NIP-29 workspace subscription: no signer attached', {
        message: 'Use "Connect to Relay" button to attach signer and fetch workspaces'
      });
      return;
    }

    // Prevent duplicate subscriptions for the same user
    const userKey = pubkey.slice(0, 8);
    if (activeSubscriptions.has(userKey)) {
      console.log('⏭️ Workspace subscription already active for user:', userKey);
      return;
    }

    console.log('🔍 Starting real-time NIP-29 workspace sync for user:', userKey);
    setLoading(true);

    // Track processed groups and member/admin data
    const processedGroups = new Set<string>();
    const groupAdmins = new Map<string, string[]>(); // groupId -> admin pubkeys
    const groupMembers = new Map<string, string[]>(); // groupId -> member pubkeys

    const processEvent = (event: any, isLive = false, deletedGroupIds?: Set<string>) => {
      try {
        const logPrefix = isLive ? '🔴 LIVE' : '📜 HISTORICAL';

        if (event.kind === 39000) {
          // Group metadata
          console.log(`${logPrefix} Group metadata event (39000):`, {
            id: event.id?.slice(0, 8),
            tags: event.tags,
            content: event.content?.slice(0, 100),
            relay: event.relay?.url
          });

          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
          console.log(`${logPrefix} Extracted group ID: "${groupId}" from tags:`, event.tags);

          if (!groupId) {
            console.warn('⚠️ Missing group ID in metadata event - tags:', event.tags);
            return;
          }

          // Skip deleted groups
          if (deletedGroupIds && deletedGroupIds.has(groupId)) {
            console.log(`${logPrefix} Skipping deleted group: ${groupId}`);
            return;
          }

          let groupName = 'Unnamed Group';
          let about: string | undefined;
          let picture: string | undefined;
          let isPrivate = true;
          let isClosed = true;
          let isBroadcast = false;

          // Parse metadata from content using the proper NIP-29 utility
          try {
            const metadata = parseGroupMetadata(event.content || '');

            console.log(`${logPrefix} Parsed metadata for ${groupId}:`, metadata);

            if (metadata && typeof metadata === 'object') {
              groupName = (metadata.name as string) || groupName;
              about = metadata.about as string;
              picture = metadata.picture as string;

              // Handle boolean metadata
              if (metadata.private === true) isPrivate = true;
              if (metadata.public === true) isPrivate = false;
              if (metadata.open === true) isClosed = false;
              if (metadata.closed === true) isClosed = true;
              if (metadata.broadcast === true) isBroadcast = true;
            } else {
              console.log(`${logPrefix} No valid metadata found for ${groupId}, using defaults`);
            }
          } catch (parseError) {
            console.warn(`${logPrefix} Failed to parse metadata for ${groupId}:`, parseError);
          }

          const workspace: Workspace = {
            id: groupId,
            name: groupName,
            description: about,
            picture: picture,
            isPublic: !isPrivate,
            isClosed: isClosed,
            isBroadcast: isBroadcast,
            relay: event.relay?.url,
            createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
            updatedAt: Date.now(),
            members: groupMembers.get(groupId) || [],
            admins: groupAdmins.get(groupId) || [],
            memberCount: groupMembers.get(groupId)?.length || 0,
            adminCount: groupAdmins.get(groupId)?.length || 0,
            scope: 'Default'
          };

          console.log(`${logPrefix} Processed workspace:`, {
            id: workspace.id,
            name: workspace.name,
            isPublic: workspace.isPublic,
            adminCount: workspace.adminCount,
            memberCount: workspace.memberCount
          });

          processedGroups.add(groupId);
          addWorkspace(workspace);

        } else if (event.kind === 39001) {
          // Group admins
          console.log(`${logPrefix} Group admins event (39001):`, {
            id: event.id?.slice(0, 8),
            tags: event.tags
          });

          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
          if (groupId && (!deletedGroupIds || !deletedGroupIds.has(groupId))) {
            const adminPubkeys = event.tags
              .filter((tag: string[]) => tag[0] === 'p')
              .map((tag: string[]) => tag[1])
              .filter(Boolean);

            groupAdmins.set(groupId, adminPubkeys);
            console.log(`${logPrefix} Updated admins for group ${groupId}:`, adminPubkeys.length);

            // Update existing workspace if it exists
            const store = useWorkspaceStore.getState();
            const existingWorkspace = store.workspaces.find(w => w.id === groupId);
            if (existingWorkspace) {
              store.updateWorkspace(groupId, {
                admins: adminPubkeys,
                adminCount: adminPubkeys.length,
                updatedAt: Date.now()
              });
              console.log(`${logPrefix} Updated existing workspace admin data for ${groupId}`);
            }
          }

        } else if (event.kind === 39002) {
          // Group members
          console.log(`${logPrefix} Group members event (39002):`, {
            id: event.id?.slice(0, 8),
            tags: event.tags
          });

          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
          if (groupId && (!deletedGroupIds || !deletedGroupIds.has(groupId))) {
            const memberPubkeys = event.tags
              .filter((tag: string[]) => tag[0] === 'p')
              .map((tag: string[]) => tag[1])
              .filter(Boolean);

            groupMembers.set(groupId, memberPubkeys);
            console.log(`${logPrefix} Updated members for group ${groupId}:`, memberPubkeys.length);

            // Update existing workspace if it exists
            const store = useWorkspaceStore.getState();
            const existingWorkspace = store.workspaces.find(w => w.id === groupId);
            if (existingWorkspace) {
              store.updateWorkspace(groupId, {
                members: memberPubkeys,
                memberCount: memberPubkeys.length,
                updatedAt: Date.now()
              });
              console.log(`${logPrefix} Updated existing workspace member data for ${groupId}`);
            }
          }

        } else if (event.kind === 9007) {
          // Group creation
          console.log(`${logPrefix} Group creation event (9007):`, {
            id: event.id?.slice(0, 8),
            tags: event.tags
          });

          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
          if (!groupId) return;

          // Skip deleted groups
          if (deletedGroupIds && deletedGroupIds.has(groupId)) {
            console.log(`${logPrefix} Skipping deleted group creation event: ${groupId}`);
            return;
          }

          if (!processedGroups.has(groupId)) {
            let metadata: any = {};
            try {
              metadata = event.content ? JSON.parse(event.content) : {};
            } catch (error) {
              console.log('Creation event content not JSON, using default');
            }

            const workspace: Workspace = {
              id: groupId,
              name: metadata.name || 'New Group',
              description: metadata.about,
              picture: metadata.picture,
              isPublic: metadata.public === true,
              isClosed: metadata.closed !== false,
              isBroadcast: metadata.broadcast === true,
              relay: event.relay?.url,
              createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
              updatedAt: Date.now(),
              members: groupMembers.get(groupId) || [],
              admins: groupAdmins.get(groupId) || [],
              memberCount: groupMembers.get(groupId)?.length || 0,
              adminCount: groupAdmins.get(groupId)?.length || 0,
              scope: 'Default'
            };

            processedGroups.add(groupId);
            addWorkspace(workspace);
          }
        }
        // Removed content event processing - only managed groups with proper metadata are included
      } catch (error) {
        console.error('❌ Failed to process event:', error);
      }
    };

    const initializeWorkspaces = async () => {
      try {
        // Mark this user as having an active subscription
        activeSubscriptions.set(userKey, 'active');

        // PHASE 1: HISTORICAL DATA FETCH (like message pattern)
        console.log('📜 PHASE 1: Fetching historical workspace data...');

        // Wait for relay connection - simple approach
        console.log('📡 Waiting for relay connections...');
        const pool = ndk.pool;
        const allRelays = Array.from(pool.relays.values());
        const usableRelays = allRelays.filter(relay => {
          return relay.status >= 1 || relay.connectivity?.status === 'connected';
        });

        if (usableRelays.length === 0) {
          console.warn('📡 No connected relays available, waiting 2s...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(`📡 Found ${usableRelays.length} connected relays`);
        }

        // Fetch all workspace-related events (simple approach)
        const workspaceFilter = {
          kinds: [39000, 39001, 39002, 9007] as NDKKind[]
        };
        const deletionFilter = {
          kinds: [9008] as NDKKind[]
        };

        console.log('📜 Fetching workspace events...');
        const [workspaceEvents, deletionEvents] = await Promise.all([
          ndk.fetchEvents(workspaceFilter),
          ndk.fetchEvents(deletionFilter)
        ]);

        console.log(`📜 Found ${workspaceEvents?.size || 0} workspace events, ${deletionEvents?.size || 0} deletion events`);

        // Build set of deleted group IDs
        const deletedGroupIds = new Set<string>();
        deletionEvents.forEach(event => {
          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
          if (groupId) {
            deletedGroupIds.add(groupId);
          }
        });

        let latestTimestamp = 0;

        // Process historical events
        workspaceEvents.forEach((event) => {
          processEvent(event, false, deletedGroupIds);
          if (event.created_at && event.created_at > latestTimestamp) {
            latestTimestamp = event.created_at;
          }
        });

        console.log('📜 Historical workspace processing complete');

        // Sync channels for ALL loaded workspaces (both new and existing)
        const allWorkspaceIds = Array.from(processedGroups);
        if (allWorkspaceIds.length > 0) {
          console.log('🔄 Scheduling channel sync for all workspaces:', allWorkspaceIds);
          setTimeout(async () => {
            try {
              const { syncChannelsForWorkspace } = await import('../hooks/use-channels');
              for (const workspaceId of allWorkspaceIds) {
                console.log('🔄 Syncing channels for workspace:', workspaceId);
                await syncChannelsForWorkspace(workspaceId);
              }
              console.log('✅ Channel sync completed for all workspaces');
            } catch (error) {
              console.error('❌ Failed to sync channels:', error);
            }
          }, 2000); // Increased delay to ensure workspaces are fully loaded
        }

        // PHASE 2: LIVE SUBSCRIPTION (like message pattern)
        console.log('🔴 PHASE 2: Starting live workspace subscription...');

        const liveFilter = {
          kinds: [39000, 39001, 39002, 9007, 9008, 9] as NDKKind[], // Added kind 9 for messages
          since: latestTimestamp + 1 // Only new events after historical data
        };

        const liveSubscription = ndk.subscribe(liveFilter);

        if (!liveSubscription) {
          console.warn('⚠️ Could not create live workspace subscription');
          setLoading(false);
          return;
        }

        // Handle live events
        liveSubscription.on('event', (event) => {
          console.log('🔴 LIVE workspace event:', event.kind, event.id?.slice(0, 8));

          if (event.kind === 9008) {
            // Handle group deletion
            const groupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
            if (groupId) {
              console.log('🔴 LIVE Group deletion:', groupId);
              deletedGroupIds.add(groupId);
              const store = useWorkspaceStore.getState();
              store.removeWorkspace(groupId);
            }
          } else if (event.kind === 9) {
            // Handle new message events to discover channels
            const groupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
            const channelTag = event.tags.find((tag: string[]) => tag[0] === 'c');

            if (groupId && channelTag && channelTag[1] && !deletedGroupIds.has(groupId)) {
              const channelName = channelTag[1];
              console.log('🔴 LIVE New channel detected from message:', channelName, 'in workspace:', groupId);

              // Check if we know about this workspace and if channel exists
              const store = useWorkspaceStore.getState();
              const workspace = store.workspaces.find(w => w.id === groupId);

              if (workspace) {
                // Add channel to database if it doesn't exist
                setTimeout(async () => {
                  try {
                    const { db } = await import('@/lib/db/schema');
                    const channelId = `${groupId}-${channelName}`;
                    const existingChannel = await db.channels.get(channelId);

                    if (!existingChannel) {
                      console.log('🔴 Adding new channel from live message:', channelName);
                      await db.channels.add({
                        id: channelId,
                        workspaceId: groupId,
                        name: channelName,
                        description: `Discussion in #${channelName}`,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                      console.log('✅ New channel added from live message:', channelName);
                    }
                  } catch (error) {
                    console.error('❌ Failed to add channel from live message:', error);
                  }
                }, 100);
              }
            }
          } else {
            processEvent(event, true, deletedGroupIds);

            // If this is a new workspace being added, sync its channels
            if (event.kind === 9007 || event.kind === 39000) {
              const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
              if (groupId && !deletedGroupIds.has(groupId)) {
                console.log('🔴 LIVE New workspace detected, syncing channels:', groupId);
                setTimeout(async () => {
                  try {
                    const { syncChannelsForWorkspace } = await import('../hooks/use-channels');
                    await syncChannelsForWorkspace(groupId);
                    console.log('✅ Channel sync completed for new workspace:', groupId);
                  } catch (error) {
                    console.error('❌ Failed to sync channels for new workspace:', error);
                  }
                }, 1000);
              }
            }
          }
        });

        liveSubscription.on('eose', () => {
          console.log('✅ Live workspace subscription active');
          setLoading(false);
        });

        // Cleanup function
        return () => {
          console.log('🛑 Stopping workspace subscription for user:', userKey);
          activeSubscriptions.delete(userKey);
          subscriptionActiveRef.current = false;
          try {
            liveSubscription.stop();
          } catch (error) {
            console.error('Error stopping workspace subscription:', error);
          }
          setLoading(false);
        };

      } catch (error) {
        console.error('❌ Failed to initialize workspaces:', error);
        setError(error instanceof Error ? error.message : 'Workspace initialization failed');
        setLoading(false);
        activeSubscriptions.delete(userKey);
      }
    };

    // Start the two-phase initialization
    let cleanupFn: (() => void) | undefined;

    initializeWorkspaces().then((cleanup) => {
      cleanupFn = cleanup;
    });

    // Return cleanup function for useEffect
    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
    };

  }, [ndk, pubkey, ndk?.signer]); // Run when signer is ready - real-time per account
}

// Hook to create a new workspace
export function useCreateWorkspace() {
  const { ndk, publish } = useNDK();
  const { pubkey } = useAuthStore();
  const { addWorkspace } = useWorkspaceStore();

  const createWorkspace = async (params: {
    name: string;
    description?: string;
    picture?: string;
    isPublic?: boolean;
  }) => {
    if (!ndk || !pubkey) {
      throw new Error('NDK or user not available');
    }

    console.log('🏗️ Creating new workspace:', params.name);

    try {
      // Generate random group ID
      const groupId = Math.random().toString(36).substring(2, 15);

      // Create group creation event (kind 9007) as per relay implementation
      const groupEvent = new (await import('@nostr-dev-kit/ndk')).NDKEvent(ndk);
      groupEvent.kind = 9007; // KIND_GROUP_CREATE_9007 - Group creation
      groupEvent.content = JSON.stringify({
        name: params.name,
        about: params.description,
        picture: params.picture,
        public: params.isPublic || false,
        visibility: params.isPublic ? 'public' : 'private'
      });
      groupEvent.tags = [
        ['h', groupId], // NIP-29 group ID tag
        ['d', groupId], // Addressable event identifier
      ];

      await publish(groupEvent);

      // Immediately add the workspace to the store
      const workspace: Workspace = {
        id: groupId,
        name: params.name,
        description: params.description,
        picture: params.picture,
        isPublic: params.isPublic || false,
        isClosed: false,
        isBroadcast: false,
        relay: ndk.pool.relays.values().next().value?.url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        members: [pubkey],
        admins: [pubkey],
        memberCount: 1,
        adminCount: 1,
        scope: 'Default'
      };

      addWorkspace(workspace);
      console.log('✅ Workspace added to store immediately:', workspace);

      console.log('✅ Workspace created successfully:', {
        groupId,
        name: params.name,
        eventId: groupEvent.id
      });

      return groupId;
    } catch (error) {
      console.error('❌ Failed to create workspace:', error);
      throw error;
    }
  };

  return { createWorkspace };
}