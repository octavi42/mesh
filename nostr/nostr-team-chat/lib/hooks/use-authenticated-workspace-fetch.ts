'use client';

import { useCallback } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore, type Workspace } from '@/lib/stores/workspace-store-clean';
import { parseGroupMetadataFromTags, extractAllTagValues } from '@/lib/nostr/nip29/utils';
import { NIP29EventKind } from '@/lib/nostr/nip29/types';

interface FetchOptions {
  forceRefresh?: boolean;
  maxRetries?: number;
}

// Helper to wait for relay connection
async function waitForRelayConnection(ndk: any, maxWaitMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const relays = Array.from(ndk.pool.relays.values()) as any[];
    const connectedRelay = relays.find((relay) => relay.status >= 1);
    
    if (connectedRelay) {
      console.log('✅ Relay connected:', connectedRelay.url);
      return true;
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

// Helper to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

/**
 * Hook for fetching workspaces with proper NIP-42 authentication handling
 * This ensures we wait for the relay to authenticate before fetching private groups
 */
export function useAuthenticatedWorkspaceFetch() {
  const { ndk } = useNDK();
  const { pubkey } = useAuthStore();
  const { setWorkspaces, addWorkspace, setLoading, setError } = useWorkspaceStore();

  const fetchAuthenticatedWorkspaces = useCallback(async (options: FetchOptions = {}) => {
    const maxRetries = options.maxRetries ?? 3;
    
    if (!ndk || !pubkey) {
      console.log('⏭️ Cannot fetch workspaces: missing NDK or pubkey');
      return;
    }

    if (!ndk.signer) {
      console.log('⏭️ Cannot fetch workspaces: no signer attached');
      return;
    }

    console.log('🔐 Starting authenticated workspace fetch...');
    setLoading(true);
    setError(null);

    try {
      // Wait for relay connection with timeout
      const isConnected = await waitForRelayConnection(ndk, 10000);
      
      if (!isConnected) {
        console.warn('⚠️ No relay connected, attempting to reconnect...');
        try {
          await ndk.connect();
          // Wait again for connection
          const reconnected = await waitForRelayConnection(ndk, 5000);
          if (!reconnected) {
            throw new Error('Failed to connect to relay after reconnection attempt');
          }
        } catch (reconnectError) {
          console.error('❌ Reconnection failed:', reconnectError);
          throw new Error('Relay disconnected and reconnection failed');
        }
      }

      // Wait a bit for auth to complete after connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📡 Fetching groups where user is a member...');

      // Use retry logic for the main fetch operation
      const memberEvents = await retryWithBackoff(async () => {
        const events = await ndk.fetchEvents({
          kinds: [NIP29EventKind.GroupMembers as number],
          '#p': [pubkey],
          limit: 50,
        });
        
        // If we got 0 events but connection is good, it might just be empty
        // Only throw if there's an actual error
        return events;
      }, maxRetries);

      console.log(`📦 Found ${memberEvents.size} member events`);

      const workspacesMap = new Map<string, Workspace>();

      // Step 2: Extract group IDs from member events
      for (const event of memberEvents) {
        const groupId = event.tags.find(([tag]) => tag === 'd')?.[1];
        if (!groupId) continue;

        console.log(`📋 Found group membership: ${groupId}`);

        // Create initial workspace entry
        workspacesMap.set(groupId, {
          id: groupId,
          name: 'Loading...',
          isPublic: false,
          createdAt: Date.now(),
          updatedAt: (event.created_at || Math.floor(Date.now() / 1000)) * 1000,
          members: extractAllTagValues(event.tags, 'p'),
          memberCount: extractAllTagValues(event.tags, 'p').length,
        });
      }

      // Step 3: Fetch metadata for each group
      for (const [groupId, workspace] of workspacesMap) {
        try {
          // Fetch group metadata (39000)
          const metadataEvents = await ndk.fetchEvents({
            kinds: [NIP29EventKind.GroupMetadata as number],
            '#d': [groupId],
            limit: 1,
          });

          if (metadataEvents.size > 0) {
            const metadataEvent = Array.from(metadataEvents)[0];
            const metadata = parseGroupMetadataFromTags(metadataEvent.tags);

            workspace.name = typeof metadata.name === 'string' ? metadata.name : groupId;
            workspace.description = typeof metadata.about === 'string' ? metadata.about : undefined;
            workspace.picture = typeof metadata.picture === 'string' ? metadata.picture : undefined;
            workspace.isPublic = metadata.public === true;
            workspace.isClosed = metadata.closed === true;
            workspace.isBroadcast = metadata.broadcast === true;
          }

          // Fetch admin list (39001)
          const adminEvents = await ndk.fetchEvents({
            kinds: [NIP29EventKind.GroupAdmins as number],
            '#d': [groupId],
            limit: 1,
          });

          if (adminEvents.size > 0) {
            const adminEvent = Array.from(adminEvents)[0];
            workspace.admins = extractAllTagValues(adminEvent.tags, 'p');
            workspace.adminCount = workspace.admins.length;
          }

          console.log(`✅ Fetched metadata for group: ${workspace.name} (${groupId})`);
        } catch (error) {
          console.warn(`⚠️ Failed to fetch metadata for group ${groupId}:`, error);
        }
      }

      // Step 4: Update store with all workspaces
      const workspaces = Array.from(workspacesMap.values());
      console.log(`📂 Setting ${workspaces.length} workspaces in store`);
      
      if (options.forceRefresh) {
        setWorkspaces(workspaces);
      } else {
        // Merge with existing workspaces
        for (const workspace of workspaces) {
          addWorkspace(workspace);
        }
      }

      console.log('✅ Authenticated workspace fetch completed');
    } catch (error) {
      console.error('❌ Failed to fetch workspaces:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  }, [ndk, pubkey, setWorkspaces, addWorkspace, setLoading, setError]);

  return { fetchAuthenticatedWorkspaces };
}
