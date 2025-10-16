import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatState {
  currentWorkspaceId: string;
  currentChannelId: string | null;
  setCurrentWorkspace: (id: string) => void;
  setCurrentChannel: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      currentWorkspaceId: 'workspace-1',
      currentChannelId: null,
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      setCurrentChannel: (id) => set({ currentChannelId: id }),
    }),
    {
      name: 'chat-storage',
    }
  )
);
