import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatState {
  currentWorkspaceId: string;
  currentChannelId: string | null;
  setCurrentWorkspace: (id: string, channelId?: string) => void;
  setCurrentChannel: (id: string) => void;
  navigate: (workspaceId: string, channelId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: '', // Start empty, will be set by workspace store
      currentChannelId: null,

      setCurrentWorkspace: (id, channelId) => {
        console.log('🔄 Chat store: Setting workspace', id, 'channel', channelId);

        set((state) => ({
          currentWorkspaceId: id,
          currentChannelId: channelId ?? null,
        }));

        // Sync with workspace store in background (don't block UI)
        import('./workspace-store').then(({ useWorkspaceStore }) => {
          const workspaceStore = useWorkspaceStore.getState();
          workspaceStore.setCurrentWorkspace(id).catch(error => {
            console.error('Failed to sync workspace in background:', error);
          });
        });
      },

      setCurrentChannel: (id) => {
        console.log('🔄 Chat store: Setting channel', id);

        const previousChannelId = get().currentChannelId;

        // Set new channel immediately for responsive UI - this is synchronous
        set({ currentChannelId: id });

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
        });
      },
    }),
    {
      name: 'chat-storage',
    }
  )
);
