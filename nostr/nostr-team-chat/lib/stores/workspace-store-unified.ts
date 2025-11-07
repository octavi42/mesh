import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { WorkspaceDataManager, type Workspace } from '@/lib/data/workspace-data-manager';
import { SubscriptionManager } from '@/lib/data/subscription-manager';

export interface Channel {
  id: string;
  name: string;
  workspaceId: string;
  description?: string;
  isPrivate: boolean;
  memberCount: number;
  lastActivity?: number;
}

interface WorkspaceStoreState {
  // Data
  workspaces: Workspace[];
  workspacesById: Record<string, Workspace>;
  currentWorkspaceId: string | null;
  channels: Channel[];
  channelsByWorkspace: Record<string, Channel[]>;

  // Loading states
  loading: {
    workspaces: boolean;
    channels: Record<string, boolean>;
    metadata: Record<string, boolean>;
  };

  // Errors
  errors: {
    workspaces: string | null;
    channels: Record<string, string | null>;
    general: string | null;
  };

  // Managers (not persisted)
  dataManager: WorkspaceDataManager | null;
  subscriptionManager: SubscriptionManager | null;

  // Current user
  currentUserPubkey: string | null;
}

interface WorkspaceStoreActions {
  // Initialization
  initializeManagers: (pubkey: string, ndk: any) => Promise<void>;
  dispose: () => void;

  // Workspace operations
  fetchWorkspaces: (forceRefresh?: boolean) => Promise<void>;
  setCurrentWorkspace: (workspaceId: string) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (workspaceId: string) => void;

  // Channel operations
  fetchChannels: (workspaceId: string) => Promise<void>;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;

  // Error handling
  setError: (type: 'workspaces' | 'general' | string, error: string | null) => void;
  clearErrors: () => void;

  // Cache management
  clearUserData: (pubkey: string) => void;
  clearAllData: () => void;

  // Utilities
  getWorkspace: (workspaceId: string) => Workspace | null;
  getChannelsForWorkspace: (workspaceId: string) => Channel[];
  getCurrentWorkspace: () => Workspace | null;
}

type WorkspaceStore = WorkspaceStoreState & WorkspaceStoreActions;

const initialState: WorkspaceStoreState = {
  workspaces: [],
  workspacesById: {},
  currentWorkspaceId: null,
  channels: [],
  channelsByWorkspace: {},
  loading: {
    workspaces: false,
    channels: {},
    metadata: {},
  },
  errors: {
    workspaces: null,
    channels: {},
    general: null,
  },
  dataManager: null,
  subscriptionManager: null,
  currentUserPubkey: null,
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Initialize managers with NDK
        initializeManagers: async (pubkey: string, ndk: any) => {
          try {
            console.log('🔧 Initializing workspace store managers for user:', pubkey.slice(0, 8));

            if (!ndk) {
              throw new Error('NDK not available - must be passed as parameter');
            }

            // Check if we need to clear data for different user
            const currentUser = get().currentUserPubkey;
            if (currentUser && currentUser !== pubkey) {
              console.log('🔄 Different user detected, clearing previous data');
              get().clearUserData(currentUser);
            }

            // Create managers
            const dataManager = new WorkspaceDataManager(ndk);
            const subscriptionManager = new SubscriptionManager(ndk);

            set({
              dataManager,
              subscriptionManager,
              currentUserPubkey: pubkey,
              errors: { workspaces: null, channels: {}, general: null }
            });

            // Fetch initial workspace data
            await get().fetchWorkspaces();

            console.log('✅ Workspace store managers initialized');
          } catch (error) {
            console.error('❌ Failed to initialize workspace store:', error);
            set({
              errors: {
                ...get().errors,
                general: error instanceof Error ? error.message : 'Initialization failed'
              }
            });
            throw error;
          }
        },

        // Dispose of managers and cleanup
        dispose: () => {
          console.log('🗑️ Disposing workspace store');

          const { subscriptionManager, dataManager, currentUserPubkey } = get();

          if (subscriptionManager) {
            subscriptionManager.dispose();
          }

          if (dataManager && currentUserPubkey) {
            dataManager.clearUserCache(currentUserPubkey);
          }

          set({
            ...initialState,
            // Keep persisted data but clear managers
            dataManager: null,
            subscriptionManager: null,
          });
        },

        // Fetch workspaces for current user
        fetchWorkspaces: async (forceRefresh = false) => {
          const { dataManager, currentUserPubkey, loading } = get();

          if (!dataManager || !currentUserPubkey) {
            throw new Error('Store not initialized');
          }

          if (loading.workspaces) {
            console.log('⏭️ Workspace fetch already in progress');
            return;
          }

          set({
            loading: { ...get().loading, workspaces: true },
            errors: { ...get().errors, workspaces: null }
          });

          try {
            console.log('📂 Fetching workspaces...', { forceRefresh });

            const workspaces = await dataManager.fetchWorkspaceMetadata(
              currentUserPubkey,
              { forceRefresh }
            );

            // Create normalized data structure
            const workspacesById: Record<string, Workspace> = {};
            workspaces.forEach(workspace => {
              workspacesById[workspace.id] = workspace;
            });

            // Set current workspace if none selected
            let { currentWorkspaceId } = get();
            if (!currentWorkspaceId && workspaces.length > 0) {
              currentWorkspaceId = workspaces[0].id;
              console.log('📌 Set current workspace to:', currentWorkspaceId);
            }

            set({
              workspaces,
              workspacesById,
              currentWorkspaceId,
              loading: { ...get().loading, workspaces: false }
            });

            // Fetch channels for current workspace
            if (currentWorkspaceId) {
              get().fetchChannels(currentWorkspaceId);
            }

            console.log(`✅ Loaded ${workspaces.length} workspaces`);
          } catch (error) {
            console.error('❌ Failed to fetch workspaces:', error);
            set({
              loading: { ...get().loading, workspaces: false },
              errors: {
                ...get().errors,
                workspaces: error instanceof Error ? error.message : 'Failed to fetch workspaces'
              }
            });
            throw error;
          }
        },

        // Set current workspace and fetch its channels
        setCurrentWorkspace: (workspaceId: string) => {
          const { workspacesById, subscriptionManager } = get();

          if (!workspacesById[workspaceId]) {
            console.warn('❌ Workspace not found:', workspaceId);
            return;
          }

          console.log('📌 Setting current workspace:', workspaceId);

          // Cleanup previous workspace subscriptions
          if (subscriptionManager) {
            subscriptionManager.cleanupByPattern('workspace:');
            subscriptionManager.cleanupByPattern('metadata:');
          }

          set({ currentWorkspaceId: workspaceId });

          // Fetch channels for new workspace
          get().fetchChannels(workspaceId);

          // Subscribe to workspace updates
          if (subscriptionManager) {
            subscriptionManager.subscribeToWorkspaceMetadata(
              workspaceId,
              (event) => {
                console.log('📡 Received workspace metadata update:', event.kind);
                // Handle metadata updates here
                // This could trigger re-fetching workspace data or updating in place
              }
            );
          }
        },

        // Add or update workspace
        addWorkspace: (workspace: Workspace) => {
          const { workspaces, workspacesById } = get();

          const existingIndex = workspaces.findIndex(w => w.id === workspace.id);

          if (existingIndex >= 0) {
            // Update existing
            const updatedWorkspaces = [...workspaces];
            updatedWorkspaces[existingIndex] = workspace;

            set({
              workspaces: updatedWorkspaces,
              workspacesById: { ...workspacesById, [workspace.id]: workspace }
            });
          } else {
            // Add new
            set({
              workspaces: [...workspaces, workspace],
              workspacesById: { ...workspacesById, [workspace.id]: workspace }
            });
          }

          console.log('➕ Added/updated workspace:', workspace.id);
        },

        // Update workspace properties
        updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => {
          const { workspaces, workspacesById } = get();
          const existing = workspacesById[workspaceId];

          if (!existing) {
            console.warn('❌ Cannot update non-existent workspace:', workspaceId);
            return;
          }

          const updated = { ...existing, ...updates, updatedAt: Date.now() };
          const updatedWorkspaces = workspaces.map(w =>
            w.id === workspaceId ? updated : w
          );

          set({
            workspaces: updatedWorkspaces,
            workspacesById: { ...workspacesById, [workspaceId]: updated }
          });

          console.log('🔄 Updated workspace:', workspaceId);
        },

        // Remove workspace
        removeWorkspace: (workspaceId: string) => {
          const { workspaces, workspacesById, currentWorkspaceId, subscriptionManager } = get();

          // Cleanup subscriptions for this workspace
          if (subscriptionManager) {
            subscriptionManager.cleanupByPattern(`workspace:${workspaceId}`);
            subscriptionManager.cleanupByPattern(`metadata:${workspaceId}`);
          }

          const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId);
          const updatedById = { ...workspacesById };
          delete updatedById[workspaceId];

          // Update current workspace if it was removed
          let newCurrentWorkspaceId = currentWorkspaceId;
          if (currentWorkspaceId === workspaceId) {
            newCurrentWorkspaceId = updatedWorkspaces.length > 0 ? updatedWorkspaces[0].id : null;
          }

          set({
            workspaces: updatedWorkspaces,
            workspacesById: updatedById,
            currentWorkspaceId: newCurrentWorkspaceId
          });

          console.log('🗑️ Removed workspace:', workspaceId);
        },

        // Fetch channels for a workspace
        fetchChannels: async (workspaceId: string) => {
          const { loading } = get();

          if (loading.channels[workspaceId]) {
            console.log('⏭️ Channel fetch already in progress for:', workspaceId);
            return;
          }

          set({
            loading: {
              ...loading,
              channels: { ...loading.channels, [workspaceId]: true }
            }
          });

          try {
            // TODO: Implement actual channel fetching from Nostr events
            // For now, create a default general channel
            const defaultChannel: Channel = {
              id: `${workspaceId}-general`,
              name: 'general',
              workspaceId,
              description: 'General discussion',
              isPrivate: false,
              memberCount: 0,
              lastActivity: Date.now()
            };

            get().addChannel(defaultChannel);

            console.log(`✅ Loaded channels for workspace: ${workspaceId}`);
          } catch (error) {
            console.error('❌ Failed to fetch channels:', error);
            set({
              errors: {
                ...get().errors,
                channels: {
                  ...get().errors.channels,
                  [workspaceId]: error instanceof Error ? error.message : 'Failed to fetch channels'
                }
              }
            });
          } finally {
            set({
              loading: {
                ...get().loading,
                channels: { ...get().loading.channels, [workspaceId]: false }
              }
            });
          }
        },

        // Add or update channel
        addChannel: (channel: Channel) => {
          const { channels, channelsByWorkspace } = get();

          const existingIndex = channels.findIndex(c => c.id === channel.id);
          let updatedChannels: Channel[];

          if (existingIndex >= 0) {
            updatedChannels = [...channels];
            updatedChannels[existingIndex] = channel;
          } else {
            updatedChannels = [...channels, channel];
          }

          // Update workspace-specific channels
          const workspaceChannels = updatedChannels.filter(c => c.workspaceId === channel.workspaceId);

          set({
            channels: updatedChannels,
            channelsByWorkspace: {
              ...channelsByWorkspace,
              [channel.workspaceId]: workspaceChannels
            }
          });

          console.log('➕ Added/updated channel:', channel.id);
        },

        // Update channel properties
        updateChannel: (channelId: string, updates: Partial<Channel>) => {
          const { channels } = get();
          const existingIndex = channels.findIndex(c => c.id === channelId);

          if (existingIndex >= 0) {
            const updatedChannels = [...channels];
            updatedChannels[existingIndex] = { ...updatedChannels[existingIndex], ...updates };

            const workspaceId = updatedChannels[existingIndex].workspaceId;
            const workspaceChannels = updatedChannels.filter(c => c.workspaceId === workspaceId);

            set({
              channels: updatedChannels,
              channelsByWorkspace: {
                ...get().channelsByWorkspace,
                [workspaceId]: workspaceChannels
              }
            });

            console.log('🔄 Updated channel:', channelId);
          }
        },

        // Set error for specific type
        setError: (type: string, error: string | null) => {
          if (type === 'workspaces' || type === 'general') {
            set({
              errors: { ...get().errors, [type]: error }
            });
          } else {
            // Channel-specific error
            set({
              errors: {
                ...get().errors,
                channels: { ...get().errors.channels, [type]: error }
              }
            });
          }
        },

        // Clear all errors
        clearErrors: () => {
          set({
            errors: { workspaces: null, channels: {}, general: null }
          });
        },

        // Clear data for specific user
        clearUserData: (pubkey: string) => {
          const { dataManager } = get();

          if (dataManager) {
            dataManager.clearUserCache(pubkey);
          }

          // Reset state but keep managers
          set({
            workspaces: [],
            workspacesById: {},
            currentWorkspaceId: null,
            channels: [],
            channelsByWorkspace: {},
            loading: initialState.loading,
            errors: initialState.errors,
          });

          console.log('🧹 Cleared user data for:', pubkey.slice(0, 8));
        },

        // Clear all data and reset store
        clearAllData: () => {
          const { dataManager, subscriptionManager } = get();

          if (subscriptionManager) {
            subscriptionManager.cleanupAll();
          }

          if (dataManager) {
            dataManager.clearAllCache();
          }

          set(initialState);
          console.log('🧹 Cleared all workspace data');
        },

        // Utility getters
        getWorkspace: (workspaceId: string) => {
          return get().workspacesById[workspaceId] || null;
        },

        getChannelsForWorkspace: (workspaceId: string) => {
          return get().channelsByWorkspace[workspaceId] || [];
        },

        getCurrentWorkspace: () => {
          const { currentWorkspaceId, workspacesById } = get();
          return currentWorkspaceId ? workspacesById[currentWorkspaceId] || null : null;
        },
      }),
      {
        name: 'workspace-store-unified',
        partialize: (state) => ({
          // Only persist essential data, not managers or loading states
          workspaces: state.workspaces,
          workspacesById: state.workspacesById,
          currentWorkspaceId: state.currentWorkspaceId,
          channels: state.channels,
          channelsByWorkspace: state.channelsByWorkspace,
          currentUserPubkey: state.currentUserPubkey,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle migration from old store format if needed
          if (version === 0) {
            console.log('🔄 Migrating workspace store from v0 to v1');
            return {
              ...initialState,
              ...persistedState,
            };
          }
          return persistedState;
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('💧 Rehydrated workspace store with', state.workspaces.length, 'workspaces');

            // Reset non-persisted state
            state.loading = initialState.loading;
            state.errors = initialState.errors;
            state.dataManager = null;
            state.subscriptionManager = null;
          }
        },
      }
    )
  )
);

// Export selectors for efficient component subscriptions
export const workspaceSelectors = {
  workspaces: (state: WorkspaceStore) => state.workspaces,
  currentWorkspace: (state: WorkspaceStore) => state.getCurrentWorkspace(),
  isLoading: (state: WorkspaceStore) => state.loading.workspaces,
  error: (state: WorkspaceStore) => state.errors.workspaces,
  getWorkspace: (workspaceId: string) => (state: WorkspaceStore) => state.getWorkspace(workspaceId),
  getChannels: (workspaceId: string) => (state: WorkspaceStore) => state.getChannelsForWorkspace(workspaceId),
};

// Hook for subscribing to specific workspace
export const useWorkspace = (workspaceId: string | null) => {
  return useWorkspaceStore((state) =>
    workspaceId ? state.getWorkspace(workspaceId) : null
  );
};

// Hook for subscribing to channels of current workspace
export const useCurrentWorkspaceChannels = () => {
  return useWorkspaceStore((state) => {
    const currentWorkspace = state.getCurrentWorkspace();
    return currentWorkspace ? state.getChannelsForWorkspace(currentWorkspace.id) : [];
  });
};