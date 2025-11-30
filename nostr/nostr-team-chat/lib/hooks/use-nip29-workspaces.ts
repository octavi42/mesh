import { useEffect, useRef } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { NDKKind } from '@nostr-dev-kit/ndk';
import type { Workspace } from '@/lib/stores/workspace-store-clean';

// Only process managed group events - no content discovery for unmanaged groups
// This ensures we only show workspaces for properly structured groups

// Global flag to ensure workspace fetching happens only once per session
let workspacesFetched = false;

// Function to reset the session (call on user logout or user change)
export function resetWorkspaceSession() {
  workspacesFetched = false;
  console.log('🔄 Workspace session reset - will fetch on next mount');
  
  // Also clear the workspace store to prevent stale data
  const store = useWorkspaceStore.getState();
  store.clearWorkspaces();
  console.log('🔄 Workspace store cleared');
}

// Function to force refresh workspaces (for debugging deleted groups)
export function forceRefreshWorkspaces() {
  workspacesFetched = false;
  console.log('🔄 Forcing workspace refresh - clearing cache and refetching');

  // Clear the workspace store
  const store = useWorkspaceStore.getState();
  store.setWorkspaces([]);

  console.log('✅ Workspace cache cleared, will refetch on next component mount');
}

export function useNIP29Workspaces() {
  const { ndk, isConnected, hasSigner } = useNDK();
  const { pubkey } = useAuthStore();
  const { addWorkspace, setLoading, setError, workspaces } = useWorkspaceStore();
  const subscriptionActiveRef = useRef(true);
  const lastPubkeyRef = useRef<string | null>(null);

  // Reset workspace session when pubkey changes (new authentication)
  useEffect(() => {
    if (pubkey && lastPubkeyRef.current && lastPubkeyRef.current !== pubkey) {
      console.log('🔄 Pubkey changed, resetting workspace session:', {
        old: lastPubkeyRef.current?.slice(0, 8),
        new: pubkey.slice(0, 8)
      });
      resetWorkspaceSession();
    }
    lastPubkeyRef.current = pubkey;
  }, [pubkey]);

  useEffect(() => {
    console.log(' useNIP29Workspaces effect triggered:', {
      hasNdk: !!ndk,
      hasPubkey: !!pubkey,
      isConnected,
      hasSigner,
      hasNdkSigner: !!ndk?.signer,
      pubkey: pubkey?.slice(0, 8),
      workspacesFetched,
      existingWorkspaces: workspaces.length
    });

    // Only run once per session - never during navigation
    if (workspacesFetched) {
      console.log('⏭️ Workspaces already fetched this session, skipping');
      return;
    }

    if (!ndk || !pubkey) {
      console.log('⏭️ Skipping: missing ndk or pubkey');
      return;
    }

    // Wait for connection
    if (!isConnected) {
      console.log('⏭️ Skipping: not connected yet');
      return;
    }

    console.log('🔍 Starting NIP-29 workspace data fetching for user:', pubkey.slice(0, 8));
    workspacesFetched = true; // Mark as fetched immediately
    setLoading(true);

    // Note: We've removed content discovery to only show managed groups
    // Existing cached workspaces will gradually be replaced as we fetch managed ones

    // Track processed groups to avoid duplicates
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
              
              // Emit member-list-changed for live events to trigger UI refresh
              if (isLive) {
                const adminChangeEvent = new CustomEvent('member-list-changed', {
                  detail: { groupId, action: 'admins-updated', adminCount: adminPubkeys.length }
                });
                window.dispatchEvent(adminChangeEvent);
                console.log(`🔴 ${logPrefix} Emitted member-list-changed (admins) for group ${groupId}`);
              }
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

            // Check if current user was kicked (only for live events)
            const currentUserPubkey = useAuthStore.getState().pubkey;
            const previousMembers = groupMembers.get(groupId) || [];
            const wasInGroup = previousMembers.includes(currentUserPubkey || '');
            const isStillInGroup = memberPubkeys.includes(currentUserPubkey || '');
            
            if (isLive && wasInGroup && !isStillInGroup && currentUserPubkey) {
              console.log(`🚨 ${logPrefix} Current user was removed from group ${groupId}!`);
              
              // Emit a custom event that components can listen to
              const kickEvent = new CustomEvent('user-kicked-from-workspace', {
                detail: { groupId, userPubkey: currentUserPubkey }
              });
              window.dispatchEvent(kickEvent);
            }

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
              
              // Emit member-list-changed for live events to trigger UI refresh
              if (isLive) {
                const memberChangeEvent = new CustomEvent('member-list-changed', {
                  detail: { groupId, action: 'updated', memberCount: memberPubkeys.length }
                });
                window.dispatchEvent(memberChangeEvent);
                console.log(`🔴 ${logPrefix} Emitted member-list-changed for group ${groupId}`);
              }
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

        // Check if we have usable relays - be more inclusive for status checks
        const usableRelays = allRelays.filter(relay => {
          // Accept any status >= 1 (connected states) or explicit connectivity status
          // This includes status 7 which seems to be an authenticated state
          return relay.status >= 1 || relay.connectivity?.status === 'connected';
        });
        if (usableRelays.length === 0) {
          console.warn('📡 No connected relays available, waiting...');
          // Wait a bit for authentication
          await new Promise(resolve => setTimeout(resolve, 2000));

          const relaysAfterWait = Array.from(pool.relays.values());
          console.log('📡 Relay status after wait:', relaysAfterWait.map(r => ({
            url: r.url,
            status: r.status,
            hasAuth: r.hasAuth
          })));
        }

        // MANAGED GROUPS ONLY: Fetch only proper group metadata events
        console.log('📜 Fetching managed group metadata events...');
        const metadataFilter = {
          kinds: [39000, 39001, 39002, 9007] as NDKKind[]
        };
        console.log('📜 Metadata filter:', metadataFilter);
        const managedGroupEvents = await ndk.fetchEvents(metadataFilter);
        console.log(`📜 Found ${managedGroupEvents.size} managed group events`);

        // Fetch deletion events to filter out deleted groups
        console.log('📜 Fetching group deletion events...');
        const deletionFilter = {
          kinds: [9008] as NDKKind[]
        };
        const deletionEvents = await ndk.fetchEvents(deletionFilter);
        console.log(`📜 Found ${deletionEvents.size} deletion events`);

        // Build set of deleted group IDs
        const deletedGroupIds = new Set<string>();
        deletionEvents.forEach(event => {
          const groupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
          if (groupId) {
            deletedGroupIds.add(groupId);
            console.log('📜 Group marked as deleted:', groupId, 'from event:', event.id?.slice(0, 8));
          }
        });

        console.log('📜 Total deleted groups found:', deletedGroupIds.size, 'IDs:', Array.from(deletedGroupIds));

        // DETAILED DEBUGGING: Log group IDs discovered from managed events only
        const discoveredGroupIds = new Set<string>();
        if (managedGroupEvents.size > 0) {
          console.log(`📜 Processing ${managedGroupEvents.size} managed group events...`);

          Array.from(managedGroupEvents).forEach((e, index) => {
            const groupId = e.tags.find((tag: string[]) => tag[0] === 'h' || tag[0] === 'd')?.[1];
            if (groupId) {
              discoveredGroupIds.add(groupId);
              if (index < 10) { // Log first 10 events for debugging
                console.log(`📜 Managed event ${index + 1}:`, {
                  id: e.id?.slice(0, 8),
                  kind: e.kind,
                  extractedGroupId: groupId,
                  relay: e.relay?.url
                });
              }
            }
          });

          console.log(`📜 Discovered ${discoveredGroupIds.size} managed group IDs:`, Array.from(discoveredGroupIds));
        } else {
          console.log('📜 No managed group events found');
        }

        let latestTimestamp = 0;

        // Process managed group events only
        managedGroupEvents.forEach((event) => {
          processEvent(event, false, deletedGroupIds);
          if (event.created_at && event.created_at > latestTimestamp) {
            latestTimestamp = event.created_at;
          }
        });

        console.log('📜 Managed groups processing complete');

        // Sync channels for newly loaded workspaces
        const managedWorkspaceIds = Array.from(processedGroups);
        if (managedWorkspaceIds.length > 0) {
          console.log('🔄 Syncing channels for managed workspaces:', managedWorkspaceIds);
          // Import and sync channels for each workspace
          setTimeout(async () => {
            try {
              const { syncChannelsForWorkspace } = await import('../hooks/use-channels');
              for (const workspaceId of managedWorkspaceIds) {
                await syncChannelsForWorkspace(workspaceId);
              }
              console.log('✅ Channel sync completed for all managed workspaces');
            } catch (error) {
              console.error('❌ Failed to sync channels:', error);
            }
          }, 1000); // Delay to ensure workspaces are fully loaded
        }


        // LIVE SUBSCRIPTION: Only subscribe to managed group events including deletions and kicks
        console.log('🔴 Starting live subscription for managed group events including deletions...');

        const managedGroupKinds = [39000, 39001, 39002, 9001, 9007, 9008] as NDKKind[]; // Added 9001 (RemoveUser)
        const liveSubscription = ndk.subscribe({
          kinds: managedGroupKinds,
          since: latestTimestamp + 1 // Only new events after historical data
        });

        console.log('🔴 Live subscription kinds (managed + deletion):', managedGroupKinds);

        if (!liveSubscription) {
          console.warn('⚠️ Could not create live subscription - NDK not ready');
          setLoading(false);
          return;
        }

        // Handle live events
        liveSubscription.on('event', (event) => {
          if (event.kind === 9008) {
            // Handle group deletion
            const groupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
            if (groupId) {
              console.log('🔴 LIVE Group deletion event received:', groupId);
              deletedGroupIds.add(groupId);

              // Remove from workspace store
              const store = useWorkspaceStore.getState();
              store.removeWorkspace(groupId);
              console.log('🔴 LIVE Removed deleted workspace:', groupId);
            }
          } else if (event.kind === 9001) {
            // Handle user removal (kind 9001 - RemoveUser)
            const groupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
            const removedPubkey = event.tags.find((tag: string[]) => tag[0] === 'p')?.[1];
            const currentUserPubkey = useAuthStore.getState().pubkey;
            
            console.log('🔴 LIVE RemoveUser event (9001):', {
              groupId,
              removedPubkey: removedPubkey?.slice(0, 8),
              isCurrentUser: currentUserPubkey === removedPubkey
            });
            
            if (groupId && removedPubkey) {
              if (currentUserPubkey === removedPubkey) {
                console.log('🚨 LIVE Current user removed from group:', groupId);
                
                // Emit a custom event for immediate UI update
                const kickEvent = new CustomEvent('user-kicked-from-workspace', {
                  detail: { groupId, userPubkey: removedPubkey }
                });
                window.dispatchEvent(kickEvent);
              } else {
                // Another user was removed - emit member-list-changed to refresh the list
                console.log('🔴 LIVE Another user removed from group:', groupId, removedPubkey.slice(0, 8));
                const memberChangeEvent = new CustomEvent('member-list-changed', {
                  detail: { groupId, action: 'user-removed', userPubkey: removedPubkey }
                });
                window.dispatchEvent(memberChangeEvent);
              }
            }
          } else {
            processEvent(event, true, deletedGroupIds);
          }
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

  }, [ndk, pubkey, isConnected]); // Re-run when connection state changes
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