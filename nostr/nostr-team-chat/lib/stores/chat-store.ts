import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatState {
  currentWorkspaceId: string;
  currentChannelId: string | null;
  isNavigating: boolean;
  setCurrentWorkspace: (id: string, channelId?: string) => void;
  setCurrentChannel: (id: string) => void;
  setNavigating: (navigating: boolean) => void;
  navigate: (workspaceId: string, channelId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: '', // Start empty, will be set by workspace store
      currentChannelId: null,
      isNavigating: false,

      setCurrentWorkspace: (id, channelId) => {
        console.log('🔄 Chat store: Setting workspace', id, 'channel', channelId);

        set((state) => ({
          currentWorkspaceId: id,
          currentChannelId: channelId ?? null,
        }));

        // Sync with workspace store in background (don't block UI)
        import('./workspace-store-clean').then(({ useWorkspaceStore }) => {
          const workspaceStore = useWorkspaceStore.getState();
          if (workspaceStore.setCurrentWorkspace) {
            workspaceStore.setCurrentWorkspace(id);
          }
        }).catch(error => {
          console.error('Failed to sync workspace in background:', error);
        });
      },

      setCurrentChannel: (id) => {
        console.log('🔄 Chat store: Setting channel', id);

        const previousChannelId = get().currentChannelId;

        // Set new channel immediately for responsive UI - this is synchronous
        set({ currentChannelId: id, isNavigating: false });

        // Clean up previous channel subscriptions in background (non-blocking)
        if (previousChannelId && previousChannelId !== id) {
          console.log('🧹 Cleaning up previous channel:', previousChannelId);
          // Use setTimeout to avoid blocking the UI
          setTimeout(() => {
            import('./message-store').then(({ useMessageStore }) => {
              const messageStore = useMessageStore.getState();
              messageStore.unsubscribeFromChannel(previousChannelId);
            });
          }, 0);
        }
      },

      setNavigating: (navigating) => {
        set({ isNavigating: navigating });
      },

      navigate: (workspaceId, channelId) => {
        set({
          currentWorkspaceId: workspaceId,
          currentChannelId: channelId,
        });
      },

      reset: () => {
        set({
          currentWorkspaceId: '',
          currentChannelId: null,
          isNavigating: false,
        });
      },
    }),
    {
      name: 'chat-storage',
    }
  )
);
