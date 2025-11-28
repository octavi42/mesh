import { useEffect, useRef } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { NDKKind } from '@nostr-dev-kit/ndk';
import type { Workspace } from '@/lib/stores/workspace-store-clean';
import { parseGroupMetadataFromTags } from '@/lib/nostr/nip29/utils';
import { useAuthenticatedWorkspaceFetch } from './use-authenticated-workspace-fetch';

// Real-time workspace synchronization with AUTH challenge handling
// This version uses the new authenticated workspace fetching to solve the dlpnklmeoft issue

// Track if we've fetched this session (per user)
const sessionFetchedUsers = new Set<string>();

// Function to force refresh workspaces (for debugging deleted groups)
export function forceRefreshWorkspaces() {
  console.log('🔄 Forcing workspace refresh - clearing cache and refetching');

  // Clear the workspace store
  const store = useWorkspaceStore.getState();
  store.setWorkspaces([]);

  // Clear session fetch tracking
  sessionFetchedUsers.clear();

  console.log('✅ Workspace cache cleared, will refetch on next component mount');
}

// Function to clear active subscription for a specific user (on logout)
export function clearUserSubscription(userKey: string) {
  sessionFetchedUsers.delete(userKey);
  console.log('🧹 Cleared workspace session tracking for user:', userKey);
}

export function useNIP29Workspaces() {
  const { ndk, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const { setLoading, setError } = useWorkspaceStore();
  const hasFetchedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Use the new authenticated workspace fetching
  const { fetchAuthenticatedWorkspaces } = useAuthenticatedWorkspaceFetch();

  useEffect(() => {
    console.log('🔍 useNIP29Workspaces effect triggered:', {
      hasNdk: !!ndk,
      hasPubkey: !!pubkey,
      isConnected,
      pubkey: pubkey?.slice(0, 8),
      currentTime: new Date().toISOString()
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

    // Wait for connection before fetching
    if (!isConnected) {
      console.log('⏳ Waiting for relay connection before fetching workspaces...');
      // Don't return - effect will re-run when connection state changes
    }

    // Check if we've already fetched for this user this session
    const userKey = pubkey.slice(0, 16);
    if (sessionFetchedUsers.has(userKey) && hasFetchedRef.current) {
      console.log('⏭️ Skipping workspace fetch - already fetched for user this session');
      return;
    }

    console.log('🔐 Starting authenticated workspace fetch...');

    const doFetch = async () => {
      try {
        // Mark as fetching to prevent duplicate fetches
        hasFetchedRef.current = true;
        sessionFetchedUsers.add(userKey);
        retryCountRef.current = 0;
        
        await fetchAuthenticatedWorkspaces({ forceRefresh: true, maxRetries: 3 });
        console.log('✅ Authenticated workspace fetch completed');
      } catch (error) {
        console.error('❌ Authenticated workspace fetch failed:', error);
        
        // Check if it's a disconnection error and we should retry
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isDisconnectionError = errorMessage.toLowerCase().includes('disconnect') || 
                                      errorMessage.toLowerCase().includes('connection');
        
        if (isDisconnectionError && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`🔄 Disconnection detected, will retry (${retryCountRef.current}/${maxRetries})...`);
          // Allow retry by clearing fetch state
          hasFetchedRef.current = false;
          sessionFetchedUsers.delete(userKey);
          // Schedule retry after delay
          setTimeout(() => {
            if (!hasFetchedRef.current) {
              console.log('🔄 Retrying workspace fetch after disconnection...');
              doFetch();
            }
          }, 2000 * retryCountRef.current); // Exponential backoff
        } else {
          setError(errorMessage);
          // Allow manual retry by clearing fetch state after a longer delay
          setTimeout(() => {
            hasFetchedRef.current = false;
            sessionFetchedUsers.delete(userKey);
          }, 10000);
        }
      }
    };

    doFetch();

    // Return cleanup function
    return () => {
      console.log('🛑 Cleaning up workspace subscription');
    };

  }, [ndk, pubkey, ndk?.signer, isConnected, fetchAuthenticatedWorkspaces, setError]); // Added isConnected dependency
}

// Hook to create a new workspace
export function useCreateWorkspace() {
  const { ndk, publish } = useNDK();
  const { pubkey } = useAuthStore();
  const { addWorkspace, updateWorkspace, removeWorkspace } = useWorkspaceStore();

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

    // Generate group ID
    const groupId = Math.random().toString(36).substring(2, 15);

    // Create workspace object
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
      scope: 'Default',
    };

    // 1. Optimistically add to local store
    addWorkspace(workspace);
    console.log('⚡ Workspace added locally:', params.name, groupId);

    try {
      // 2. Send to relay
      const groupEvent = new (await import('@nostr-dev-kit/ndk')).NDKEvent(ndk);
      groupEvent.kind = 9007; // KIND_GROUP_CREATE_9007 - Group creation
      
      // NIP-29: Use tags for metadata, not JSON content
      groupEvent.tags = [
        ['h', groupId],
        ['name', params.name],
      ];
      
      if (params.description) {
        groupEvent.tags.push(['about', params.description]);
      }
      if (params.picture) {
        groupEvent.tags.push(['picture', params.picture]);
      }
      
      // Privacy flags as single-value tags
      groupEvent.tags.push([params.isPublic ? 'public' : 'private']);
      groupEvent.tags.push(['closed']); // Default to closed
      
      groupEvent.content = ''; // NIP-29: content should be empty

      await publish(groupEvent);

      console.log('✅ Workspace creation confirmed by relay:', {
        groupId,
        name: params.name,
        eventId: groupEvent.id
      });

      return groupId;

    } catch (error) {
      // 3. Revert on failure
      console.error('❌ Workspace creation failed, removing from local store:', error);
      removeWorkspace(groupId);
      throw error;
    }
  };

  return { createWorkspace };
}