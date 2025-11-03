import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Workspace {
  id: string; // Group ID from 'h' or 'd' tag
  name: string; // Group name from metadata
  description?: string; // About field (called "about" in relay)
  picture?: string; // Picture URL
  isPublic: boolean; // !private from relay metadata
  isClosed?: boolean; // closed field from relay metadata
  isBroadcast?: boolean; // is_broadcast field from relay metadata
  relay?: string; // Relay URL where this group exists
  createdAt: number; // Group creation timestamp
  updatedAt: number; // Last metadata update

  // Additional relay-specific fields
  memberCount?: number; // Number of members (if available)
  adminCount?: number; // Number of admins (if available)
  scope?: string; // Relay scope (usually "Default")
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setCurrentWorkspace: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearWorkspaces: () => void;

  // Getters
  getCurrentWorkspace: () => Workspace | null;
  getWorkspaceById: (id: string) => Workspace | null;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspaceId: null,
      isLoading: false,
      error: null,

      setWorkspaces: (workspaces) => {
        console.log('📂 Setting workspaces:', workspaces.length);
        set({ workspaces, error: null });
      },

      addWorkspace: (workspace) => {
        console.log('➕ Adding workspace:', workspace.name, workspace.id);
        console.log('📊 Current workspaces before adding:', get().workspaces.length);
        set((state) => {
          const newWorkspaces = [...state.workspaces.filter(w => w.id !== workspace.id), workspace];
          console.log('📊 New workspaces count after adding:', newWorkspaces.length);
          return {
            workspaces: newWorkspaces,
            error: null
          };
        });
      },

      updateWorkspace: (id, updates) => {
        console.log('📝 Updating workspace:', id);
        set((state) => ({
          workspaces: state.workspaces.map(w =>
            w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w
          )
        }));
      },

      removeWorkspace: (id) => {
        console.log('🗑️ Removing workspace:', id);
        set((state) => ({
          workspaces: state.workspaces.filter(w => w.id !== id),
          currentWorkspaceId: state.currentWorkspaceId === id ? null : state.currentWorkspaceId
        }));
      },

      setCurrentWorkspace: (id) => {
        console.log('🔄 Setting current workspace:', id);
        set({ currentWorkspaceId: id });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => {
        console.error('❌ Workspace store error:', error);
        set({ error, isLoading: false });
      },

      clearWorkspaces: () => {
        console.log('🧹 Clearing all workspaces');
        console.trace('Workspace clear called from:'); // Show stack trace
        set({
          workspaces: [],
          currentWorkspaceId: null,
          isLoading: false,
          error: null
        });
      },

      // Getters
      getCurrentWorkspace: () => {
        const state = get();
        return state.workspaces.find(w => w.id === state.currentWorkspaceId) || null;
      },

      getWorkspaceById: (id) => {
        const state = get();
        return state.workspaces.find(w => w.id === id) || null;
      },
    }),
    {
      name: 'workspace-store-clean',
      partialize: (state) => ({
        workspaces: state.workspaces,
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
);