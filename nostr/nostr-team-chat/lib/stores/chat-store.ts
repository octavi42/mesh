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
    (set) => ({
      currentWorkspaceId: 'workspace-1',
      currentChannelId: null,

      setCurrentWorkspace: (id, channelId) => {
        set((state) => ({
          currentWorkspaceId: id,
          currentChannelId: channelId ?? null,
        }));
      },

      setCurrentChannel: (id) => {
        set({ currentChannelId: id });
      },

      navigate: (workspaceId, channelId) => {
        set({
          currentWorkspaceId: workspaceId,
          currentChannelId: channelId,
        });
      },

      reset: () => {
        set({
          currentWorkspaceId: 'workspace-1',
          currentChannelId: null,
        });
      },
    }),
    {
      name: 'chat-storage',
    }
  )
);
