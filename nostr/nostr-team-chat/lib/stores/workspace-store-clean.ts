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

  // Member data from NIP-29 events
  members?: string[]; // Array of member pubkeys from 39002 events
  admins?: string[]; // Array of admin pubkeys from 39001 events
  memberCount?: number; // Computed from members array length
  adminCount?: number; // Computed from admins array length
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
  resetWorkspaces: () => void;

  // Getters
  getCurrentWorkspace: () => Workspace | null;
  getWorkspaceById: (id: string) => Workspace | null;
}

const getStorageName = () => {
  // Get current user's pubkey for account-specific storage
  const authStore = typeof window !== 'undefined' ?
    JSON.parse(localStorage.getItem('nostr-auth') || '{}') : {};
  const pubkey = authStore?.state?.pubkey;
  return pubkey ? `workspace-store-${pubkey.slice(0, 8)}` : 'workspace-store-clean';
};

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
        console.log('🔍 Workspace ID details:', {
          id: workspace.id,
          type: typeof workspace.id,
          length: workspace.id?.length,
          charCodes: workspace.id?.split('').map(c => c.charCodeAt(0))
        });
        console.log('📊 Current workspaces before adding:', get().workspaces.length);
        set((state) => {
          const newWorkspaces = [...state.workspaces.filter(w => w.id !== workspace.id), workspace];
          console.log('📊 New workspaces count after adding:', newWorkspaces.length);
          console.log('📋 All workspace IDs after adding:', newWorkspaces.map(w => w.id));
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
        if (error) {
          console.error('❌ Workspace store error:', error);
        }
        set({ error, isLoading: false });
      },

      clearWorkspaces: () => {
        console.log('🧹 Clearing all workspaces');
        console.trace('Workspace clear called from:'); // Show stack trace

        // Clear from memory
        set({
          workspaces: [],
          currentWorkspaceId: null,
          isLoading: false,
          error: null
        });

        // NOTE: Don't clear localStorage here to preserve data across connection issues
        // Only clear localStorage on explicit user logout or significant auth changes
        console.log('🧹 Cleared workspace memory (preserved localStorage)');
      },

      // Method to completely reset including localStorage (for user logout)
      resetWorkspaces: () => {
        console.log('🗑️ Completely resetting workspaces (including localStorage)');

        // Clear from memory
        set({
          workspaces: [],
          currentWorkspaceId: null,
          isLoading: false,
          error: null
        });

        // Also clear from localStorage for complete reset
        if (typeof window !== 'undefined') {
          try {
            const storageName = getStorageName();
            localStorage.removeItem(storageName);
            console.log('🗑️ Cleared workspace localStorage completely:', storageName);
          } catch (error) {
            console.warn('⚠️ Failed to clear localStorage:', error);
          }
        }
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
      name: getStorageName(),
      partialize: (state) => ({
        workspaces: state.workspaces,
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
);