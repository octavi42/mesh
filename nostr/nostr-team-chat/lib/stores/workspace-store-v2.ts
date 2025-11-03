import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NIP29Workspace } from '@/lib/db/schema';
import { createInitialAsyncState, createAsyncAction, type AsyncState } from '@/lib/data/async-state';
import { DataCoordinator } from '@/lib/coordination/data-coordinator';

// Pure state interface - no business logic
interface WorkspaceState {
  // Data
  workspaces: NIP29Workspace[];
  currentWorkspace: NIP29Workspace | null;

  // Async states for different operations
  loadingState: AsyncState<NIP29Workspace[]>;
  creationState: AsyncState<string>;
  syncState: AsyncState<void>;

  // Pure setters - no side effects
  setWorkspaces: (workspaces: NIP29Workspace[]) => void;
  setCurrentWorkspace: (workspace: NIP29Workspace | null) => void;
  updateWorkspace: (groupId: string, updates: Partial<NIP29Workspace>) => void;
  removeWorkspace: (groupId: string) => void;

  // Async action creators - delegate to coordinator
  createLoadWorkspacesAction: () => () => Promise<NIP29Workspace[]>;
  createWorkspaceAction: (params: { name: string; description?: string; picture?: string; isOpen?: boolean }) => () => Promise<string>;
  createSyncWorkspaceAction: (groupId: string) => () => Promise<void>;

  // Loading state setters
  setLoadingState: (updates: Partial<AsyncState<NIP29Workspace[]>>) => void;
  setCreationState: (updates: Partial<AsyncState<string>>) => void;
  setSyncState: (updates: Partial<AsyncState<void>>) => void;

  // Internal
  _hydrated: boolean;
  _setHydrated: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => {
      const coordinator = DataCoordinator.getInstance();

      // Set up coordinator event listeners
      coordinator.setEventListeners({
        onWorkspacesLoaded: (workspaces) => {
          get().setWorkspaces(workspaces);
        },
        onCurrentWorkspaceSet: (workspace) => {
          get().setCurrentWorkspace(workspace);
        },
        onError: (error) => {
          get().setLoadingState({ error, loading: false });
        },
        onLoadingStateChange: (loading) => {
          get().setLoadingState({ loading });
        },
      });

      return {
        // Initial state
        workspaces: [],
        currentWorkspace: null,
        loadingState: createInitialAsyncState<NIP29Workspace[]>(),
        creationState: createInitialAsyncState<string>(),
        syncState: createInitialAsyncState<void>(),
        _hydrated: false,

        // Pure setters
        setWorkspaces: (workspaces) => {
          console.log('📂 WorkspaceStore: Setting workspaces:', workspaces.length);
          set({ workspaces });

          // Update loading state
          get().setLoadingState({
            data: workspaces,
            loading: false,
            error: null,
            lastFetched: Date.now(),
          });
        },

        setCurrentWorkspace: (workspace) => {
          console.log('📂 WorkspaceStore: Setting current workspace:', workspace?.groupId || 'null');
          set({ currentWorkspace: workspace });

          // Trigger background sync if workspace changed
          if (workspace) {
            const syncAction = get().createSyncWorkspaceAction(workspace.groupId);
            syncAction().catch(error => {
              console.warn('Background workspace sync failed:', error);
            });
          }
        },

        updateWorkspace: (groupId, updates) => {
          console.log('📂 WorkspaceStore: Updating workspace:', groupId);

          set(state => ({
            workspaces: state.workspaces.map(w =>
              w.groupId === groupId ? { ...w, ...updates, updatedAt: Date.now() } : w
            ),
            currentWorkspace: state.currentWorkspace?.groupId === groupId
              ? { ...state.currentWorkspace, ...updates, updatedAt: Date.now() }
              : state.currentWorkspace,
          }));
        },

        removeWorkspace: (groupId) => {
          console.log('📂 WorkspaceStore: Removing workspace:', groupId);

          set(state => ({
            workspaces: state.workspaces.filter(w => w.groupId !== groupId),
            currentWorkspace: state.currentWorkspace?.groupId === groupId
              ? state.workspaces.find(w => w.groupId !== groupId) || null
              : state.currentWorkspace,
          }));
        },

        // Async action creators
        createLoadWorkspacesAction: () => {
          return createAsyncAction(
            async () => {
              // This would be called during app initialization
              throw new Error('Load workspaces should be handled by DataCoordinator during initialization');
            },
            (updates) => get().setLoadingState(updates)
          );
        },

        createWorkspaceAction: (params) => {
          return createAsyncAction(
            async () => {
              return await coordinator.createWorkspace(params);
            },
            (updates) => get().setCreationState(updates)
          );
        },

        createSyncWorkspaceAction: (groupId) => {
          return createAsyncAction(
            async () => {
              await coordinator.switchWorkspace(groupId);
            },
            (updates) => get().setSyncState(updates)
          );
        },

        // Loading state setters
        setLoadingState: (updates) => {
          set(state => ({
            loadingState: { ...state.loadingState, ...updates }
          }));
        },

        setCreationState: (updates) => {
          set(state => ({
            creationState: { ...state.creationState, ...updates }
          }));
        },

        setSyncState: (updates) => {
          set(state => ({
            syncState: { ...state.syncState, ...updates }
          }));
        },

        // Internal
        _setHydrated: () => set({ _hydrated: true }),
      };
    },
    {
      name: 'workspace-storage-v2',
      partialize: (state) => ({
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace,
        // Don't persist loading states - they should be recomputed
      }),
      onRehydrateStorage: () => {
        console.log('💧 WorkspaceStore: Starting hydration...');
        return (state, error) => {
          if (error) {
            console.error('❌ WorkspaceStore: Hydration error:', error);
          } else {
            console.log('✅ WorkspaceStore: Hydrated with', state?.workspaces?.length || 0, 'workspaces');
            if (state) {
              state._setHydrated();
            }
          }
        };
      },
    }
  )
);

// Computed selectors
export const useWorkspaceSelectors = () => {
  const store = useWorkspaceStore();

  return {
    // Basic selectors
    workspaces: store.workspaces,
    currentWorkspace: store.currentWorkspace,

    // Loading states
    isLoading: store.loadingState.loading || store.syncState.loading,
    isCreating: store.creationState.loading,
    error: store.loadingState.error || store.creationState.error || store.syncState.error,

    // Computed values
    hasWorkspaces: store.workspaces.length > 0,
    currentWorkspaceId: store.currentWorkspace?.groupId || null,

    // Actions
    setCurrentWorkspace: store.setCurrentWorkspace,
    createWorkspace: store.createWorkspaceAction,

    // Internal
    isHydrated: store._hydrated,
  };
};