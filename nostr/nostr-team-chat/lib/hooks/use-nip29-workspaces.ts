import { useEffect, useRef } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { NDKKind } from '@nostr-dev-kit/ndk';
import type { Workspace } from '@/lib/stores/workspace-store-clean';

// Define content kinds that can contain group information (matching groups_relay app)
const hTaggedContentKinds: NDKKind[] = [
  9009, // CreateInvite - invites use h tags
  9021, // JoinRequest - join requests use h tags
  9000, // PutUser - user management uses h tags
  9001, // RemoveUser - user removal uses h tags
  9,    // Chat message ⭐ KEY for discovering groups!
  11,   // DM
];

// Global flag to ensure workspace fetching happens only once per session
let workspacesFetched = false;

// Function to reset the session (call on user logout)
export function resetWorkspaceSession() {
  workspacesFetched = false;
  console.log('🔄 Workspace session reset - will fetch on next mount');
}

export function useNIP29Workspaces() {
  const { ndk, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const { addWorkspace, setLoading, setError, workspaces } = useWorkspaceStore();

  useEffect(() => {
    console.log('🔍 useNIP29Workspaces effect triggered:', {
      hasNdk: !!ndk,
      hasPubkey: !!pubkey,
      isConnected,
      pubkey: pubkey?.slice(0, 8),
      workspacesFetched,
      existingWorkspaces: workspaces.length
    });

    // Only run once per session - never during navigation
    if (workspacesFetched) {
      console.log('⏭️ Workspaces already fetched this session, skipping');
      return;
    }

    if (!ndk || !pubkey || !isConnected) {
      console.log('⏭️ Skipping NIP-29 workspace subscription: missing requirements');
      return;
    }

    console.log('🔍 Starting NIP-29 workspace data fetching for user:', pubkey.slice(0, 8));
    workspacesFetched = true; // Mark as fetched immediately
    setLoading(true);

    // CRITICAL: Never clear existing workspaces - only add new ones like groups_relay

    // Track processed groups to avoid duplicates
    const processedGroups = new Set<string>();
    const groupAdmins = new Map<string, string[]>(); // groupId -> admin pubkeys
    const groupMembers = new Map<string, string[]>(); // groupId -> member pubkeys

    const processEvent = (event: any, isLive = false) => {
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

          let groupName = 'Unnamed Group';
          let about: string | undefined;
          let picture: string | undefined;
          let isPrivate = true;
          let isClosed = true;
          let isBroadcast = false;

          for (const tag of event.tags) {
            const [tagType, value] = tag;
            switch (tagType) {
              case 'name': groupName = value || groupName; break;
              case 'about': about = value; break;
              case 'picture': picture = value; break;
              case 'private': isPrivate = true; break;
              case 'public': isPrivate = false; break;
              case 'open': isClosed = false; break;
              case 'closed': isClosed = true; break;
              case 'broadcast': isBroadcast = true; break;
              case 'nonbroadcast': isBroadcast = false; break;
            }
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
            adminCount: groupAdmins.get(groupId)?.length || 0,
            memberCount: groupMembers.get(groupId)?.length || 0,
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
          if (groupId) {
            const adminPubkeys = event.tags
              .filter((tag: string[]) => tag[0] === 'p')
              .map((tag: string[]) => tag[1])
              .filter(Boolean);

            groupAdmins.set(groupId, adminPubkeys);
            console.log(`${logPrefix} Updated admins for group ${groupId}:`, adminPubkeys.length);
          }

        } else if (event.kind === 39002) {
          // Group members
          console.log(`${logPrefix} Group members event (39002):`, {
            id: event.id?.slice(0, 8),
            tags: event.tags
          });

          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
          if (groupId) {
            const memberPubkeys = event.tags
              .filter((tag: string[]) => tag[0] === 'p')
              .map((tag: string[]) => tag[1])
              .filter(Boolean);

            groupMembers.set(groupId, memberPubkeys);
            console.log(`${logPrefix} Updated members for group ${groupId}:`, memberPubkeys.length);
          }

        } else if (event.kind === 9007) {
          // Group creation
          console.log(`${logPrefix} Group creation event (9007):`, {
            id: event.id?.slice(0, 8),
            tags: event.tags
          });

          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
          if (!groupId) return;

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
              scope: 'Default'
            };

            processedGroups.add(groupId);
            addWorkspace(workspace);
          }
        } else if (event.kind === 9 || event.kind === 11 || event.kind === 9000 || event.kind === 9001) {
          // Content events - create workspace if not exists
          console.log(`${logPrefix} Content event (${event.kind}):`, {
            id: event.id?.slice(0, 8),
            tags: event.tags
          });

          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
          if (!groupId) return;

          if (!processedGroups.has(groupId)) {
            // Create workspace from content discovery (no metadata available)
            const workspace: Workspace = {
              id: groupId,
              name: groupId.includes("'") ? groupId.split("'")[1] || 'Chat Group' : 'Chat Group',
              description: 'Group discovered through chat messages',
              picture: undefined,
              isPublic: false, // Default to private since we don't have metadata
              isClosed: true,
              isBroadcast: false,
              relay: event.relay?.url,
              createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
              updatedAt: Date.now(),
              scope: 'Default'
            };

            console.log(`${logPrefix} Creating workspace from content for group: ${groupId}`, workspace);
            processedGroups.add(groupId);
            addWorkspace(workspace);
          }
        }
      } catch (error) {
        console.error('❌ Failed to process event:', error);
      }
    };

    const initializeWorkspaces = async () => {
      try {
        // PHASE 1: HISTORICAL DATA FETCH (like working test app)
        console.log('📜 PHASE 1: Fetching historical workspace data...');

        // Wait for relay authentication like working test app does
        const pool = ndk.pool;
        const allRelays = Array.from(pool.relays.values());
        console.log('📡 Relay status check before fetch:', {
          totalRelays: allRelays.length,
          relayStates: allRelays.map(r => ({
            url: r.url,
            status: r.status,
            connectivity: r.connectivity,
            hasAuth: r.hasAuth,
            statusName: ['disconnected', 'connecting', 'connected', 'reconnecting', 'error', 'authenticated', 'connected_readonly'][r.status] || `unknown_${r.status}`
          }))
        });

        // Check if we have properly connected/authenticated relays
        const connectedRelays = allRelays.filter(r => r.status === 2 || r.status === 5 || r.status === 6);
        if (connectedRelays.length === 0) {
          console.warn('📡 No connected/authenticated relays available, waiting...');
          // Wait a bit for authentication
          await new Promise(resolve => setTimeout(resolve, 2000));

          const relaysAfterWait = Array.from(pool.relays.values());
          console.log('📡 Relay status after wait:', relaysAfterWait.map(r => ({
            url: r.url,
            status: r.status,
            hasAuth: r.hasAuth
          })));
        }

        // PHASE 1: METADATA DISCOVERY (existing approach)
        console.log('📜 PHASE 1: Fetching group metadata events...');
        const metadataFilter = {
          kinds: [39000, 39001, 39002, 9007] as NDKKind[]
        };
        console.log('📜 Metadata filter:', metadataFilter);
        const historicalEvents = await ndk.fetchEvents(metadataFilter);
        console.log(`📜 PHASE 1 result: ${historicalEvents.size} metadata events found`);

        // PHASE 2: CONTENT DISCOVERY (new - matches groups_relay app)
        console.log('📜 PHASE 2: Discovering groups through content events...');
        const contentFilter = {
          kinds: hTaggedContentKinds,
          limit: 500 // Reasonable limit for content discovery
        };
        console.log('📜 Content filter:', contentFilter);
        const contentEvents = await ndk.fetchEvents(contentFilter);
        console.log(`📜 PHASE 2 result: ${contentEvents.size} content events found`);

        // Combine both event sets
        const combinedEvents = new Set([...historicalEvents, ...contentEvents]);
        console.log(`📜 COMBINED: ${combinedEvents.size} total events (${historicalEvents.size} metadata + ${contentEvents.size} content)`);

        // Use combined events for processing
        const historicalEventsToProcess = combinedEvents;

        // DETAILED DEBUGGING: Log group IDs discovered from all events
        const discoveredGroupIds = new Set<string>();
        if (historicalEventsToProcess.size > 0) {
          console.log(`📜 Processing ${historicalEventsToProcess.size} events to discover groups...`);

          Array.from(historicalEventsToProcess).forEach((e, index) => {
            const groupId = e.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
            if (groupId) {
              discoveredGroupIds.add(groupId);
              if (index < 10) { // Log first 10 events for debugging
                console.log(`📜 Event ${index + 1}:`, {
                  id: e.id?.slice(0, 8),
                  kind: e.kind,
                  extractedGroupId: groupId,
                  source: historicalEvents.has(e) ? 'metadata' : 'content',
                  relay: e.relay?.url
                });
              }
            }
          });

          console.log(`📜 Discovered ${discoveredGroupIds.size} unique group IDs:`, Array.from(discoveredGroupIds));
        } else {
          console.log('📜 No events found from either metadata or content discovery');
        }

        let latestTimestamp = 0;

        // Process all combined events (metadata + content)
        historicalEventsToProcess.forEach((event) => {
          processEvent(event, false);
          if (event.created_at && event.created_at > latestTimestamp) {
            latestTimestamp = event.created_at;
          }
        });

        console.log('📜 Historical data processing complete');

        // PHASE 3: LIVE SUBSCRIPTION for both metadata and content (enhanced)
        console.log('🔴 PHASE 3: Starting live subscription for metadata and content...');

        const allKinds = [...new Set([39000, 39001, 39002, 9007, ...hTaggedContentKinds])];
        const liveSubscription = ndk.subscribe({
          kinds: allKinds as NDKKind[],
          since: latestTimestamp + 1 // Only new events after historical data
        });

        console.log('🔴 Live subscription kinds:', allKinds);

        if (!liveSubscription) {
          console.warn('⚠️ Could not create live subscription - NDK not ready');
          setLoading(false);
          return;
        }

        // Handle live events
        liveSubscription.on('event', (event) => {
          processEvent(event, true);
        });

        liveSubscription.on('eose', () => {
          console.log('✅ Live subscription EOSE - real-time updates active');
          setLoading(false);
        });

        // Cleanup function
        return () => {
          console.log('🛑 Stopping NIP-29 workspace subscriptions');
          subscriptionActiveRef.current = false;
          try {
            liveSubscription.stop();
          } catch (error) {
            console.log('Error stopping subscription:', error);
          }
          setLoading(false);
        };

      } catch (error) {
        console.error('❌ Failed to fetch workspace data:', error);
        setError(error instanceof Error ? error.message : 'Data fetching failed');
        setLoading(false);
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

  }, [ndk, pubkey, isConnected]); // Run when auth/connection is ready, but only once per session
}

// Hook to create a new workspace
export function useCreateWorkspace() {
  const { ndk, publish } = useNDK();
  const { pubkey } = useAuthStore();

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