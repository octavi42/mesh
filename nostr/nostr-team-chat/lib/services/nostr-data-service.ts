import type { NIP29Workspace } from '@/lib/db/schema';
import { NostrRelayManager } from './nostr-relay-manager';
import { workspaceRepository } from '@/lib/data/workspace-repository';
import {
  createGroupEvent,
  NIP29SubscriptionManager,
} from '@/lib/nostr/nip29';
import { NIP29EventKind } from '@/lib/nostr/nip29/types';
import { parseGroupMetadataFromTags, extractAllTagValues, createGroupId, generateLocalGroupId } from '@/lib/nostr/nip29/utils';

export interface CreateWorkspaceParams {
  name: string;
  description?: string;
  picture?: string;
  isOpen?: boolean;
}

export interface WorkspaceUpdates {
  name?: string;
  description?: string;
  picture?: string;
  isOpen?: boolean;
  isPublic?: boolean;
  admins?: string[];
  members?: string[];
}

export class NostrDataService {
  private static instance: NostrDataService;
  private relayManager: NostrRelayManager;

  static getInstance(): NostrDataService {
    if (!NostrDataService.instance) {
      NostrDataService.instance = new NostrDataService();
    }
    return NostrDataService.instance;
  }

  constructor() {
    this.relayManager = NostrRelayManager.getInstance();
  }

  async fetchCachedWorkspaces(): Promise<NIP29Workspace[]> {
    console.log('📂 Fetching cached workspaces...');
    return await workspaceRepository.findAll();
  }

  async fetchWorkspacesForUser(pubkey: string): Promise<NIP29Workspace[]> {
    console.log('📂 Fetching workspaces for user:', pubkey.substring(0, 8));
    return await workspaceRepository.findByUser(pubkey);
  }

  async discoverWorkspaces(pubkey: string): Promise<NIP29Workspace[]> {
    console.log('🔍 Discovering workspaces for user:', pubkey.substring(0, 8));

    try {
      // Ensure relay connection
      await this.relayManager.connect();

      // Find groups where user is a member
      const memberEvents = await this.relayManager.fetchEvents({
        kinds: [NIP29EventKind.GroupMembers],
        '#p': [pubkey],
        limit: 50,
      });

      console.log('📦 Found', memberEvents.length, 'potential groups');

      const discoveredWorkspaces: NIP29Workspace[] = [];
      const existingWorkspaces = await workspaceRepository.findAll();
      const existingGroupIds = new Set(existingWorkspaces.map(w => w.groupId));

      for (const event of memberEvents) {
        const localGroupId = event.tags.find(([tag]) => tag === 'd')?.[1];
        if (!localGroupId) continue;

        const relayUrl = this.relayManager.getRelayUrl();
        if (!relayUrl) continue;

        const relayHost = relayUrl.replace('wss://', '').replace('ws://', '');
        const fullGroupId = `${relayHost}'${localGroupId}`;

        // Skip if we already have this workspace
        if (existingGroupIds.has(fullGroupId)) continue;

        const workspace: NIP29Workspace = {
          groupId: fullGroupId,
          relayUrl,
          name: 'Loading...',
          description: undefined,
          picture: undefined,
          isOpen: false,
          isPublic: false,
          admins: [],
          members: [pubkey],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastSyncedAt: 0,
        };

        discoveredWorkspaces.push(workspace);
        await workspaceRepository.save(workspace);

        console.log('➕ Discovered new workspace:', fullGroupId);
      }

      return discoveredWorkspaces;
    } catch (error) {
      console.error('❌ Failed to discover workspaces:', error);
      throw new Error('Failed to discover workspaces from relay');
    }
  }

  async createWorkspace(params: CreateWorkspaceParams, creatorPubkey: string): Promise<string> {
    console.log('🏗️ Creating workspace:', params.name);

    try {
      // Ensure relay connection
      await this.relayManager.connect();

      const relayUrl = this.relayManager.getRelayUrl();
      if (!relayUrl) {
        throw new Error('No relay connection available');
      }

      const localId = generateLocalGroupId();
      const groupId = createGroupId(relayUrl.replace('wss://', ''), localId);
      const localGroupId = groupId.includes("'") ? groupId.split("'")[1] : localId;

      // Create group event
      const event = await createGroupEvent(
        params.name,
        localGroupId,
        params.description,
        params.picture,
        params.isOpen || false
      );

      console.log('📤 Publishing group creation event...');
      await this.relayManager.publishEvent(event);

      // Create workspace object
      const workspace: NIP29Workspace = {
        groupId,
        relayUrl,
        name: params.name,
        description: params.description,
        picture: params.picture,
        isOpen: params.isOpen || false,
        isPublic: false,
        admins: [creatorPubkey],
        members: [creatorPubkey],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSyncedAt: Date.now(),
      };

      await workspaceRepository.save(workspace);

      console.log('✅ Workspace created:', groupId);
      return groupId;
    } catch (error) {
      console.error('❌ Failed to create workspace:', error);
      throw new Error(`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async syncWorkspace(groupId: string): Promise<WorkspaceUpdates> {
    console.log('🔄 Syncing workspace:', groupId);

    try {
      // Ensure relay connection
      await this.relayManager.connect();

      const parts = groupId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : groupId;

      // Fetch latest workspace data from relay
      const [metadataEvents, adminsEvents, membersEvents] = await Promise.all([
        this.relayManager.fetchEvents({
          kinds: [NIP29EventKind.GroupMetadata],
          '#d': [localGroupId],
          limit: 1,
        }),
        this.relayManager.fetchEvents({
          kinds: [NIP29EventKind.GroupAdmins],
          '#d': [localGroupId],
          limit: 1,
        }),
        this.relayManager.fetchEvents({
          kinds: [NIP29EventKind.GroupMembers],
          '#d': [localGroupId],
          limit: 1,
        }),
      ]);

      const updates: WorkspaceUpdates = {};

      // Parse metadata from event tags (NIP-29 standard for relay-generated 39000 events)
      if (metadataEvents[0]) {
        const metadata = parseGroupMetadataFromTags(metadataEvents[0].tags);
        if (typeof metadata.name === 'string') {
          updates.name = metadata.name;
        }
        updates.description = typeof metadata.about === 'string' ? metadata.about : undefined;
        updates.picture = typeof metadata.picture === 'string' ? metadata.picture : undefined;
        updates.isOpen = metadata.open === true;
        updates.isPublic = metadata.public === true;
      }

      // Parse admins
      if (adminsEvents[0]) {
        updates.admins = extractAllTagValues(adminsEvents[0].tags, 'p');
      }

      // Parse members
      if (membersEvents[0]) {
        updates.members = extractAllTagValues(membersEvents[0].tags, 'p');
      }

      // Update in repository
      await workspaceRepository.update(groupId, {
        ...updates,
        lastSyncedAt: Date.now(),
      });

      console.log('✅ Workspace synced:', groupId);
      return updates;
    } catch (error) {
      console.error('❌ Failed to sync workspace:', error);
      throw new Error(`Failed to sync workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async leaveWorkspace(groupId: string): Promise<void> {
    console.log('🚪 Leaving workspace:', groupId);

    try {
      await workspaceRepository.delete(groupId);
      console.log('✅ Left workspace:', groupId);
    } catch (error) {
      console.error('❌ Failed to leave workspace:', error);
      throw new Error(`Failed to leave workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clearAllWorkspaces(): Promise<void> {
    console.log('🧹 Clearing all workspace data...');

    try {
      await workspaceRepository.clear();
      console.log('✅ All workspace data cleared');
    } catch (error) {
      console.error('❌ Failed to clear workspace data:', error);
      throw new Error('Failed to clear workspace data');
    }
  }

  // Subscribe to workspace updates
  subscribeToWorkspace(
    groupId: string,
    onUpdate: (updates: WorkspaceUpdates) => void
  ): () => void {
    console.log('📡 Subscribing to workspace updates:', groupId);

    const parts = groupId.split("'");
    const localGroupId = parts.length === 2 ? parts[1] : groupId;

    // Subscribe to metadata updates
    const unsubscribeMetadata = this.relayManager.subscribe(
      {
        kinds: [NIP29EventKind.GroupMetadata],
        '#d': [localGroupId],
      },
      (event) => {
        console.log('📡 Received metadata update for:', groupId);
        // Parse metadata from event tags (NIP-29 standard for relay-generated 39000 events)
        const metadata = parseGroupMetadataFromTags(event.tags);
        const updates: WorkspaceUpdates = {};

        if (typeof metadata.name === 'string') {
          updates.name = metadata.name;
        }
        updates.description = typeof metadata.about === 'string' ? metadata.about : undefined;
        updates.picture = typeof metadata.picture === 'string' ? metadata.picture : undefined;
        updates.isOpen = metadata.open === true;
        updates.isPublic = metadata.public === true;

        onUpdate(updates);
      }
    );

    // Return unsubscribe function
    return () => {
      this.relayManager.unsubscribe(unsubscribeMetadata);
    };
  }
}