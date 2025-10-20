import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, type NIP29Workspace } from '@/lib/db/schema';
import {
  getGlobalNIP29Client,
  createGroupEvent,
  NIP29SubscriptionManager,
} from '@/lib/nostr/nip29';
import { NIP29EventKind } from '@/lib/nostr/nip29/types';
import { parseGroupMetadata, extractAllTagValues, createGroupId, generateLocalGroupId } from '@/lib/nostr/nip29/utils';
import { useAuthStore } from './auth-store';

interface WorkspaceStore {
  workspaces: NIP29Workspace[];
  currentWorkspace: NIP29Workspace | null;
  isLoading: boolean;
  error: string | null;
  subscriptionManager: NIP29SubscriptionManager | null;
  userPubkey: string | null;

  initializeClient: () => Promise<void>;
  createWorkspace: (name: string, description?: string, picture?: string, isOpen?: boolean) => Promise<string>;
  fetchWorkspaces: () => Promise<void>;
  discoverMyGroups: () => Promise<void>;
  syncWorkspace: (groupId: string) => Promise<void>;
  setCurrentWorkspace: (groupId: string) => void;
  subscribeToWorkspace: (groupId: string) => void;
  unsubscribeFromWorkspace: (groupId: string) => void;
  leaveWorkspace: (groupId: string) => Promise<void>;
  updateWorkspaceLocal: (groupId: string, updates: Partial<NIP29Workspace>) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      isLoading: false,
      error: null,
      subscriptionManager: null,
      userPubkey: null,

      initializeClient: async () => {
        try {
          const { pubkey: currentPubkey } = useAuthStore.getState();

          if (!currentPubkey) {
            console.warn('No authenticated user, cannot initialize workspace');
            return;
          }

          const existingUserPubkey = get().userPubkey;
          if (existingUserPubkey && existingUserPubkey !== currentPubkey) {
            console.log('🔄 Different user detected, clearing workspace data');
            await get().clearAllData();
          }

          set({ isLoading: true, error: null, userPubkey: currentPubkey });

          const client = getGlobalNIP29Client();

          if (!client.isConnected()) {
            await client.connect();
          }

          const subManager = new NIP29SubscriptionManager(client);
          set({ subscriptionManager: subManager });

          await get().fetchWorkspaces();

          await get().discoverMyGroups();

          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to initialize NIP-29 client:', error);
          set({ error: 'Failed to connect to relay', isLoading: false });
        }
      },

      createWorkspace: async (name, description, picture, isOpen = false) => {
        try {
          set({ isLoading: true, error: null });

          const client = getGlobalNIP29Client();
          if (!client.isConnected()) {
            await client.connect();
          }

          const relayUrl = client.getRelayUrl();
          const localId = generateLocalGroupId();
          const groupId = createGroupId(relayUrl.replace('wss://', ''), localId);

          const event = await createGroupEvent(name, groupId, description, picture, isOpen);
          await client.publishEvent(event);

          console.log('✅ Workspace creation event published:', event.id, 'groupId:', groupId);

          const { addUserEvent } = await import('@/lib/nostr/nip29/events');
          const addSelfEvent = await addUserEvent(groupId, event.pubkey);
          await client.publishEvent(addSelfEvent);
          console.log('✅ Added self as member:', addSelfEvent.id);

          const workspace: NIP29Workspace = {
            groupId,
            relayUrl,
            name,
            description,
            picture,
            isOpen,
            isPublic: false,
            admins: [event.pubkey],
            members: [event.pubkey],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastSyncedAt: Date.now(),
          };

          await db.nip29Workspaces.add(workspace);

          set((state) => ({
            workspaces: [...state.workspaces, workspace],
            currentWorkspace: workspace,
            isLoading: false,
          }));

          setTimeout(() => {
            get().syncWorkspace(groupId);
          }, 2000);

          return groupId;
        } catch (error) {
          console.error('Failed to create workspace:', error);
          set({ error: 'Failed to create workspace', isLoading: false });
          throw error;
        }
      },

      fetchWorkspaces: async () => {
        try {
          const workspaces = await db.nip29Workspaces.toArray();
          set({ workspaces });

          if (workspaces.length > 0 && !get().currentWorkspace) {
            set({ currentWorkspace: workspaces[0] });
          }
        } catch (error) {
          console.error('Failed to fetch workspaces:', error);
        }
      },

      discoverMyGroups: async () => {
        try {
          const { pubkey: myPubkey } = useAuthStore.getState();

          if (!myPubkey) {
            console.warn('User not authenticated, skipping group discovery');
            return;
          }

          const client = getGlobalNIP29Client();

          if (!client.isConnected()) {
            console.warn('Client not connected, skipping group discovery');
            return;
          }

          console.log('🔍 Discovering groups for pubkey:', myPubkey);

          console.log('🔎 Querying with filter:', {
            kinds: [NIP29EventKind.GroupMembers],
            '#p': [myPubkey],
            limit: 50,
          });

          const memberEvents = await client.fetchEvents({
            kinds: [NIP29EventKind.GroupMembers],
            '#p': [myPubkey],
            limit: 50,
          });

          console.log('📦 Found', memberEvents.length, 'potential groups');

          const allMetadataEvents = await client.fetchEvents({
            kinds: [NIP29EventKind.GroupMetadata],
            limit: 20,
          });
          console.log('📋 All group metadata events on relay:', allMetadataEvents.length);
          allMetadataEvents.forEach(e => {
            const groupId = e.tags.find(([tag]) => tag === 'd')?.[1];
            console.log('  - Group:', groupId, 'by', e.pubkey.substring(0, 8));
          });

          const allMemberEvents = await client.fetchEvents({
            kinds: [NIP29EventKind.GroupMembers],
            limit: 20,
          });
          console.log('📋 All member events on relay:', allMemberEvents.length);
          allMemberEvents.forEach(e => {
            const groupId = e.tags.find(([tag]) => tag === 'd')?.[1];
            const members = e.tags.filter(([tag]) => tag === 'p').map(([, pubkey]) => pubkey.substring(0, 8));
            console.log('  - Group:', groupId, 'Members:', members);
          });

          const discoveredGroupIds = new Set<string>();

          for (const event of memberEvents) {
            console.log('📋 Member event:', event);
            console.log('📋 Event tags:', event.tags);

            const localGroupId = event.tags.find(([tag]) => tag === 'd')?.[1];
            console.log('📋 Extracted local group ID from d tag:', localGroupId);

            if (!localGroupId) {
              console.warn('⚠️ No group ID found in event');
              continue;
            }

            const relayHost = client.getRelayUrl().replace('wss://', '').replace('ws://', '');
            const fullGroupId = `${relayHost}'${localGroupId}`;
            console.log('✅ Full group ID:', fullGroupId);

            discoveredGroupIds.add(fullGroupId);
          }

          console.log('🔎 Discovered group IDs:', Array.from(discoveredGroupIds));

          const existingWorkspaces = await db.nip29Workspaces.toArray();
          const existingGroupIds = new Set(existingWorkspaces.map((w) => w.groupId));

          console.log('📋 Existing group IDs:', Array.from(existingGroupIds));

          const newGroupIds = Array.from(discoveredGroupIds).filter(
            (gid) => !existingGroupIds.has(gid)
          );

          console.log('✨ Found', newGroupIds.length, 'new groups to add');
          if (newGroupIds.length > 0) {
            console.log('➕ New groups:', newGroupIds);
          }

          for (const groupId of newGroupIds) {
            const parts = groupId.split("'");
            if (parts.length !== 2) continue;

            const relayHost = parts[0];
            const relayUrl = `wss://${relayHost}`;

            const workspace: NIP29Workspace = {
              groupId,
              relayUrl,
              name: 'Loading...',
              description: undefined,
              picture: undefined,
              isOpen: false,
              isPublic: false,
              admins: [],
              members: [myPubkey],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              lastSyncedAt: 0,
            };

            await db.nip29Workspaces.add(workspace);
            console.log('➕ Added group:', groupId);

            setTimeout(() => {
              get().syncWorkspace(groupId);
              get().subscribeToWorkspace(groupId);
            }, 1000);
          }

          await get().fetchWorkspaces();

          console.log('✅ Group discovery complete');
        } catch (error) {
          console.error('Failed to discover groups:', error);
        }
      },

      syncWorkspace: async (groupId) => {
        try {
          const client = getGlobalNIP29Client();

          const parts = groupId.split("'");
          const localGroupId = parts.length === 2 ? parts[1] : groupId;

          const metadataEvents = await client.fetchEvents({
            kinds: [NIP29EventKind.GroupMetadata],
            '#d': [localGroupId],
            limit: 1,
          });

          const adminsEvents = await client.fetchEvents({
            kinds: [NIP29EventKind.GroupAdmins],
            '#d': [localGroupId],
            limit: 1,
          });

          const membersEvents = await client.fetchEvents({
            kinds: [NIP29EventKind.GroupMembers],
            '#d': [localGroupId],
            limit: 1,
          });

          const updates: Partial<NIP29Workspace> = {
            lastSyncedAt: Date.now(),
          };

          if (metadataEvents[0]) {
            const metadata = parseGroupMetadata(metadataEvents[0].content);
            if (typeof metadata.name === 'string') {
              updates.name = metadata.name;
            }
            updates.description = typeof metadata.about === 'string' ? metadata.about : undefined;
            updates.picture = typeof metadata.picture === 'string' ? metadata.picture : undefined;
            updates.isOpen = metadata.open === true;
            updates.isPublic = metadata.public === true;
          }

          if (adminsEvents[0]) {
            updates.admins = extractAllTagValues(adminsEvents[0].tags, 'p');
          }

          if (membersEvents[0]) {
            updates.members = extractAllTagValues(membersEvents[0].tags, 'p');
          }

          await get().updateWorkspaceLocal(groupId, updates);

          console.log('✅ Workspace synced:', groupId);
        } catch (error) {
          console.error('Failed to sync workspace:', error);
        }
      },

      setCurrentWorkspace: (groupId) => {
        const workspace = get().workspaces.find((w) => w.groupId === groupId);
        if (workspace) {
          set({ currentWorkspace: workspace });
        }
      },

      subscribeToWorkspace: (groupId) => {
        const { subscriptionManager } = get();
        if (!subscriptionManager) return;

        subscriptionManager.subscribeToGroupMetadata(groupId, (updates) => {
          get().updateWorkspaceLocal(groupId, updates);
        });

        subscriptionManager.subscribeToGroupAdmins(groupId, (admins) => {
          get().updateWorkspaceLocal(groupId, { admins });
        });

        subscriptionManager.subscribeToGroupMembers(groupId, (members) => {
          get().updateWorkspaceLocal(groupId, { members });
        });

        console.log('📡 Subscribed to workspace:', groupId);
      },

      unsubscribeFromWorkspace: (groupId) => {
        const { subscriptionManager } = get();
        if (!subscriptionManager) return;

        subscriptionManager.unsubscribeFromGroup(groupId);
        console.log('🔌 Unsubscribed from workspace:', groupId);
      },

      leaveWorkspace: async (groupId) => {
        try {
          await db.nip29Workspaces.delete(groupId);
          await db.nip29Members.where({ groupId }).delete();

          set((state) => ({
            workspaces: state.workspaces.filter((w) => w.groupId !== groupId),
            currentWorkspace:
              state.currentWorkspace?.groupId === groupId
                ? state.workspaces[0] || null
                : state.currentWorkspace,
          }));

          get().unsubscribeFromWorkspace(groupId);
        } catch (error) {
          console.error('Failed to leave workspace:', error);
          throw error;
        }
      },

      updateWorkspaceLocal: async (groupId, updates) => {
        try {
          await db.nip29Workspaces.update(groupId, {
            ...updates,
            updatedAt: Date.now(),
          });

          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.groupId === groupId ? { ...w, ...updates, updatedAt: Date.now() } : w
            ),
            currentWorkspace:
              state.currentWorkspace?.groupId === groupId
                ? { ...state.currentWorkspace, ...updates, updatedAt: Date.now() }
                : state.currentWorkspace,
          }));
        } catch (error) {
          console.error('Failed to update workspace locally:', error);
        }
      },

      clearAllData: async () => {
        try {
          console.log('🧹 Clearing all workspace data');

          const { subscriptionManager } = get();
          if (subscriptionManager) {
            get().workspaces.forEach((w) => {
              subscriptionManager.unsubscribeFromGroup(w.groupId);
            });
          }

          await db.nip29Workspaces.clear();
          await db.nip29Members.clear();

          set({
            workspaces: [],
            currentWorkspace: null,
            subscriptionManager: null,
            userPubkey: null,
          });

          if (typeof window !== 'undefined') {
            localStorage.removeItem('workspace-storage');
          }

          console.log('✅ Workspace data cleared');
        } catch (error) {
          console.error('Failed to clear workspace data:', error);
        }
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace,
        userPubkey: state.userPubkey,
      }),
    }
  )
);
