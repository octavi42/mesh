import { useEffect, useRef } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { NDKKind } from '@nostr-dev-kit/ndk';
import type { Workspace } from '@/lib/stores/workspace-store-clean';

export function useNIP29Workspaces() {
  const { ndk, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const { addWorkspace, setLoading, setError } = useWorkspaceStore();
  const subscriptionActiveRef = useRef(false);

  useEffect(() => {
    console.log('🔍 useNIP29Workspaces effect triggered:', {
      hasNdk: !!ndk,
      hasPubkey: !!pubkey,
      isConnected,
      pubkey: pubkey?.slice(0, 8)
    });

    if (!ndk || !pubkey || !isConnected) {
      console.log('⏭️ Skipping NIP-29 workspace subscription: missing requirements');
      console.log('  - NDK status:', ndk ? 'available' : 'missing');
      console.log('  - Pubkey status:', pubkey ? 'available' : 'missing');
      console.log('  - Connection status:', isConnected ? 'connected' : 'not connected');
      subscriptionActiveRef.current = false;
      return;
    }

    if (subscriptionActiveRef.current) {
      console.log('⏭️ Subscription already active, skipping duplicate');
      return;
    }

    console.log('🔍 Starting NIP-29 workspace subscription for user:', pubkey.slice(0, 8));
    subscriptionActiveRef.current = true;
    setLoading(true);

    try {
      // Based on relay analysis: subscribe to group metadata events (39000) and group creation events (9007)

      // Track processed groups to avoid duplicates
      const processedGroups = new Set<string>();

      // 1. Subscribe to group metadata events (kind 39000) - this contains the actual group data
      const metadataSubscription = ndk.subscribe({
        kinds: [39000 as NDKKind], // KIND_GROUP_METADATA_39000 from relay
        limit: 50
      });

      metadataSubscription.on('event', (event) => {
        try {
          console.log('📦 Received group metadata event (39000):', {
            id: event.id?.slice(0, 8),
            kind: event.kind,
            pubkey: event.pubkey?.slice(0, 8),
            relay: event.relay?.url,
            tags: event.tags
          });

          // Extract group ID from 'd' tag (addressable event identifier)
          const groupId = event.tags.find(tag => tag[0] === 'd')?.[1];

          console.log('🔍 Raw group ID extracted from d tag:', {
            dTag: event.tags.find(tag => tag[0] === 'd'),
            groupId,
            relay: event.relay?.url
          });

          if (!groupId) {
            console.warn('⚠️ Group metadata event missing group ID (d tag)');
            return;
          }

          // Sanitize group ID - ensure it's clean and doesn't contain URL parts
          const sanitizedGroupId = groupId.trim();
          if (sanitizedGroupId !== groupId) {
            console.warn('⚠️ Group ID had whitespace, sanitized:', { original: groupId, sanitized: sanitizedGroupId });
          }

          // Validate group ID format - should be alphanumeric
          if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedGroupId)) {
            console.warn('⚠️ Invalid group ID format, skipping:', sanitizedGroupId);
            return;
          }

          if (processedGroups.has(sanitizedGroupId)) {
            console.log('🔄 Group already processed, skipping:', sanitizedGroupId);
            return;
          }

          // Parse group metadata from tags (relay stores metadata as tags, not content)
          let groupName = 'Unnamed Group';
          let about: string | undefined;
          let picture: string | undefined;
          let isPrivate = true; // Default private
          let isClosed = true; // Default closed
          let isBroadcast = false; // Default not broadcast

          // Process tags to extract metadata
          for (const tag of event.tags) {
            const [tagType, value] = tag;
            switch (tagType) {
              case 'name':
                groupName = value || groupName;
                break;
              case 'about':
                about = value;
                break;
              case 'picture':
                picture = value;
                break;
              case 'private':
                isPrivate = true;
                break;
              case 'public':
                isPrivate = false;
                break;
              case 'open':
                isClosed = false;
                break;
              case 'closed':
                isClosed = true;
                break;
              case 'broadcast':
                isBroadcast = true;
                break;
              case 'nonbroadcast':
                isBroadcast = false;
                break;
            }
          }

          // Create workspace object with relay-accurate mapping
          const workspace: Workspace = {
            id: sanitizedGroupId,
            name: groupName,
            description: about,
            picture: picture,
            isPublic: !isPrivate, // Invert: relay uses "private", we use "isPublic"
            isClosed: isClosed,
            isBroadcast: isBroadcast,
            relay: event.relay?.url,
            createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
            updatedAt: Date.now(),
            scope: 'Default' // Most groups are in default scope
          };

          console.log('✅ Processed group metadata workspace:', {
            id: workspace.id,
            name: workspace.name,
            isPublic: workspace.isPublic,
            isClosed: workspace.isClosed,
            relay: workspace.relay
          });

          console.log('🔍 About to add workspace with ID:', workspace.id, 'Type:', typeof workspace.id);

          processedGroups.add(sanitizedGroupId);
          addWorkspace(workspace);
        } catch (error) {
          console.error('❌ Failed to process group metadata event:', error);
        }
      });

      metadataSubscription.on('eose', () => {
        console.log('✅ Group metadata subscription EOSE - metadata sync complete');
      });

      // 2. Subscribe to group creation events (kind 9007) to catch new groups
      const creationSubscription = ndk.subscribe({
        kinds: [9007 as NDKKind], // KIND_GROUP_CREATE_9007 from relay
        limit: 30
      });

      creationSubscription.on('event', (event) => {
        try {
          console.log('🆕 Received group creation event (9007):', {
            id: event.id?.slice(0, 8),
            kind: event.kind,
            content: event.content?.slice(0, 100),
            relay: event.relay?.url
          });

          // Extract group ID from 'h' tag (NIP-29 group ID)
          const groupId = event.tags.find(tag => tag[0] === 'h')?.[1];

          console.log('🔍 Raw group ID extracted from h tag (creation):', {
            hTag: event.tags.find(tag => tag[0] === 'h'),
            groupId,
            relay: event.relay?.url
          });

          if (!groupId) {
            return; // Skip if no ID
          }

          // Sanitize group ID
          const sanitizedGroupId = groupId.trim();
          if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedGroupId)) {
            console.warn('⚠️ Invalid group ID format in creation event, skipping:', sanitizedGroupId);
            return;
          }

          if (processedGroups.has(sanitizedGroupId)) {
            return; // Skip if already processed
          }

          // Parse creation event content for initial metadata
          let metadata: any = {};
          try {
            metadata = event.content ? JSON.parse(event.content) : {};
          } catch (error) {
            console.log('Creation event content not JSON, using default');
          }

          const workspace: Workspace = {
            id: sanitizedGroupId,
            name: metadata.name || 'New Group',
            description: metadata.about,
            picture: metadata.picture,
            isPublic: metadata.public === true || metadata.visibility === 'public',
            isClosed: metadata.closed !== false, // Default closed unless explicitly open
            isBroadcast: metadata.broadcast === true,
            relay: event.relay?.url,
            createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
            updatedAt: Date.now(),
            scope: 'Default'
          };

          console.log('✅ Processed group creation workspace:', {
            id: workspace.id,
            name: workspace.name,
            isPublic: workspace.isPublic,
            relay: workspace.relay
          });

          processedGroups.add(sanitizedGroupId);
          addWorkspace(workspace);
        } catch (error) {
          console.error('❌ Failed to process group creation event:', error);
        }
      });

      creationSubscription.on('eose', () => {
        console.log('✅ Group creation subscription EOSE - creation events sync complete');
        setLoading(false);
      });

      // 3. Also subscribe to group messages (kind 9) to discover groups through activity
      const messagesSubscription = ndk.subscribe({
        kinds: [9 as NDKKind], // Group chat messages
        limit: 30
      });

      messagesSubscription.on('event', (event) => {
        try {
          const groupId = event.tags.find(tag => tag[0] === 'h')?.[1];

          console.log('🔍 Raw group ID extracted from h tag (message discovery):', {
            hTag: event.tags.find(tag => tag[0] === 'h'),
            groupId,
            relay: event.relay?.url
          });

          if (!groupId) {
            return;
          }

          // Sanitize group ID
          const sanitizedGroupId = groupId.trim();
          if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedGroupId)) {
            console.warn('⚠️ Invalid group ID format in message discovery, skipping:', sanitizedGroupId);
            return;
          }

          if (!processedGroups.has(sanitizedGroupId)) {
            console.log('💬 Discovered group through message activity:', {
              groupId: sanitizedGroupId.slice(0, 8),
              relay: event.relay?.url
            });

            // Create minimal workspace from message discovery
            const workspace: Workspace = {
              id: sanitizedGroupId,
              name: `Group ${sanitizedGroupId.slice(0, 8)}`, // Temporary name
              isPublic: false, // Assume private until metadata loads
              relay: event.relay?.url,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              scope: 'Default'
            };

            processedGroups.add(sanitizedGroupId);
            addWorkspace(workspace);
          }
        } catch (error) {
          console.log('Error processing group message for discovery:', error);
        }
      });

      messagesSubscription.on('eose', () => {
        console.log('✅ Group messages subscription EOSE');
      });

      // Cleanup function
      return () => {
        console.log('🛑 Stopping NIP-29 workspace subscriptions');
        subscriptionActiveRef.current = false;
        try {
          metadataSubscription.stop();
          creationSubscription.stop();
          messagesSubscription.stop();
        } catch (error) {
          console.log('Error stopping subscriptions:', error);
        }
        setLoading(false);
      };

    } catch (error) {
      console.error('❌ Failed to create NIP-29 workspace subscription:', error);
      setError(error instanceof Error ? error.message : 'Subscription failed');
      setLoading(false);
    }
  }, [ndk, pubkey, isConnected]); // Removed function dependencies to prevent unnecessary re-runs
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