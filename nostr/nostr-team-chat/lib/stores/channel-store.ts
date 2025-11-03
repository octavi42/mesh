import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  picture?: string;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ChannelState {
  channels: Channel[];
  currentChannelId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (id: string, updates: Partial<Channel>) => void;
  removeChannel: (id: string) => void;
  setCurrentChannel: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearChannels: () => void;

  // Getters
  getCurrentChannel: () => Channel | null;
  getChannelById: (id: string) => Channel | null;
  getChannelsForWorkspace: (workspaceId: string) => Channel[];
}

export const useChannelStore = create<ChannelState>()(
  persist(
    (set, get) => ({
      channels: [],
      currentChannelId: null,
      isLoading: false,
      error: null,

      setChannels: (channels) => {
        console.log('📋 Setting channels:', channels.length);
        set({ channels, error: null });
      },

      addChannel: (channel) => {
        console.log('➕ Adding channel:', channel.name, channel.id);
        set((state) => ({
          channels: [...state.channels.filter(c => c.id !== channel.id), channel],
          error: null
        }));
      },

      updateChannel: (id, updates) => {
        console.log('📝 Updating channel:', id);
        set((state) => ({
          channels: state.channels.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
          )
        }));
      },

      removeChannel: (id) => {
        console.log('🗑️ Removing channel:', id);
        set((state) => ({
          channels: state.channels.filter(c => c.id !== id),
          currentChannelId: state.currentChannelId === id ? null : state.currentChannelId
        }));
      },

      setCurrentChannel: (id) => {
        console.log('🔄 Setting current channel:', id);
        set({ currentChannelId: id });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => {
        console.error('❌ Channel store error:', error);
        set({ error, isLoading: false });
      },

      clearChannels: () => {
        console.log('🧹 Clearing all channels');
        set({
          channels: [],
          currentChannelId: null,
          isLoading: false,
          error: null
        });
      },

      // Getters
      getCurrentChannel: () => {
        const state = get();
        return state.channels.find(c => c.id === state.currentChannelId) || null;
      },

      getChannelById: (id) => {
        const state = get();
        return state.channels.find(c => c.id === id) || null;
      },

      getChannelsForWorkspace: (workspaceId) => {
        const state = get();
        return state.channels.filter(c => c.workspaceId === workspaceId);
      },
    }),
    {
      name: 'channel-store',
      partialize: (state) => ({
        channels: state.channels,
        currentChannelId: state.currentChannelId,
      }),
    }
  )
);