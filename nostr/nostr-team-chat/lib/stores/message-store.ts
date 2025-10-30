import { create } from 'zustand';
import { db, type Message } from '@/lib/db/schema';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';
import type { NostrEvent } from '@/lib/nostr/nip29/types';

interface MessageStore {
  messages: Record<string, Message[]>;
  recentEventIds: Record<string, string[]>;
  subscriptions: Record<string, string>;
  activeChannelId: string | null;
  loadingChannels: Record<string, boolean>;
  loadedChannels: Record<string, boolean>;

  getMessages: (channelId: string) => Message[];
  sendMessage: (groupId: string, channelId: string, content: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  loadMessages: (channelId: string, groupId: string) => Promise<void>;
  subscribeToChannel: (channelId: string, groupId: string) => void;
  unsubscribeFromChannel: (channelId: string) => void;
  clearAllMessages: () => Promise<void>;
  clearAllSubscriptions: () => void;
  isChannelLoading: (channelId: string) => boolean;
  isChannelLoaded: (channelId: string) => boolean;
  setChannelLoading: (channelId: string) => void;
  clearChannelMessages: (channelId: string) => void;
  clearAllLoadingStates: () => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: {},
  recentEventIds: {},
  subscriptions: {},
  activeChannelId: null,
  loadingChannels: {},
  loadedChannels: {},

  getMessages: (channelId) => {
    return get().messages[channelId] || [];
  },

  sendMessage: async (groupId, channelId, content) => {
    if (!content.trim()) return;

    try {
      console.log('🔍 Checking window.nostr availability...');
      console.log('window.nostr:', window.nostr);

      if (!window.nostr) {
        console.error('❌ window.nostr is not available');
        alert('Nostr signer not available. Please make sure you are logged in.');
        throw new Error('Nostr extension not available. Please install a Nostr extension like Alby or nos2x.');
      }

      console.log('✅ window.nostr is available');

      const localNsec = localStorage.getItem('nostr-login-local-key');
      if (localNsec) {
        console.log('✅ Using LOCAL nsec key - signs instantly, no windows needed!');
      } else {
        console.log('⚠️ Using remote signer - may need external app/tab open');
      }

      const client = getGlobalNIP29Client();

      if (!client.isConnected()) {
        console.log('🔌 Connecting to relay...');
        await client.connect();
      }

      console.log('🔑 Getting pubkey from window.nostr...');
      let pubkey: string;
      try {
        pubkey = await window.nostr.getPublicKey();
        console.log('✅ Got pubkey:', pubkey.substring(0, 8));
      } catch (error) {
        console.error('❌ Failed to get pubkey:', error);
        alert('Failed to access your Nostr keys. Please check your signer app.');
        throw new Error('Failed to access Nostr keys. Please check your extension.');
      }

      const parts = groupId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : groupId;

      // Get the channel name from the channel ID by looking it up in the database
      const { db } = await import('@/lib/db/schema');
      const channel = await db.channels.get(channelId);
      const channelName = channel?.name;

      console.log('📋 Channel lookup:', { channelId, channelName, channel });

      const tags: string[][] = [
        ['h', localGroupId],
      ];

      // Add channel tag using NIP-29 'c' format if we have a channel name
      if (channelName) {
        tags.push(['c', channelName]);
        console.log('✅ Added channel tag:', ['c', channelName]);
      } else {
        console.warn('⚠️ No channel name found for channelId:', channelId);
      }

      const recentEvents = get().recentEventIds[channelId] || [];
      recentEvents.slice(-3).forEach(eventId => {
        tags.push(['previous', eventId]);
      });

      const unsignedEvent = {
        kind: 9,
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: content.trim(),
      };

      console.log('📝 Signing event...');
      console.log('Unsigned event:', unsignedEvent);

      let signedEvent;
      try {
        console.log('⏳ Attempting to sign with window.nostr...');

        signedEvent = await Promise.race([
          window.nostr.signEvent(unsignedEvent),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Signing timeout after 60 seconds')), 60000)
          )
        ]);

        console.log('✅ Event signed successfully!');
        console.log('Signed event:', signedEvent);
      } catch (error) {
        console.error('❌ Failed to sign event:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (errorMsg.includes('timeout')) {
          alert('Signing timed out. Please:\n\n1. Open nsec.app in another tab: https://nsec.app\n2. Make sure you see the signing request popup\n3. Approve the signature\n4. Try sending the message again');
        } else {
          alert('Failed to sign message:\n\n' + errorMsg + '\n\nTry:\n1. Opening nsec.app in another tab\n2. Logging out and back in\n3. Making sure nsec.app has permission for kind 9 events');
        }
        throw new Error('Failed to sign message: ' + errorMsg);
      }

      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        channelId,
        authorPubkey: pubkey,
        content: content.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      get().addMessage(channelId, tempMessage);

      console.log('📡 Publishing event to relay...');
      await client.publishEvent(signedEvent);
      console.log('✅ Event published to relay!');

      const confirmedMessage: Message = {
        id: signedEvent.id,
        channelId,
        authorPubkey: signedEvent.pubkey,
        content: signedEvent.content,
        createdAt: signedEvent.created_at * 1000,
        updatedAt: signedEvent.created_at * 1000,
      };

      await db.messages.put(confirmedMessage);

      set((state) => {
        const channelMessages = state.messages[channelId] || [];
        const withoutTempAndDuplicates = channelMessages.filter(m => m.id !== tempMessage.id && m.id !== signedEvent.id);

        const eventIds = state.recentEventIds[channelId] || [];

        return {
          messages: {
            ...state.messages,
            [channelId]: [...withoutTempAndDuplicates, confirmedMessage].sort((a, b) => a.createdAt - b.createdAt)
          },
          recentEventIds: {
            ...state.recentEventIds,
            [channelId]: [...eventIds, signedEvent.id].slice(-10)
          }
        };
      });

      console.log('✅ Message sent:', signedEvent.id);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  addMessage: (channelId, message) => {
    set((state) => {
      const channelMessages = state.messages[channelId] || [];
      const exists = channelMessages.some(m => m.id === message.id);
      if (exists) return {};

      return {
        messages: {
          ...state.messages,
          [channelId]: [...channelMessages, message].sort((a, b) => a.createdAt - b.createdAt)
        }
      };
    });
  },

  loadMessages: async (channelId, groupId) => {
    const state = get();

    // Set loading state immediately - even before checking if already loading
    set((state) => ({
      loadingChannels: {
        ...state.loadingChannels,
        [channelId]: true
      }
    }));

    // Prevent duplicate loading requests
    if (state.loadingChannels[channelId]) {
      console.log('⏭️ Already loading, but continuing with this request:', channelId);
    }

    try {
      console.log('📥 Loading messages for channel:', channelId, 'group:', groupId);

      const client = getGlobalNIP29Client();

      // Ensure connection is stable
      if (!client.isConnected()) {
        console.log('🔌 Message store: Connecting to relay...');
        await client.connect();
      }

      // Don't clear messages immediately - keep them for smooth UX until new ones load
      console.log('📡 Fetching fresh messages for channel:', channelId);

      // Load from local database first for immediate display
      const localMessages = await db.messages.where('channelId').equals(channelId).toArray();
      console.log('💾 Found', localMessages.length, 'local messages for channel:', channelId);

      if (localMessages.length > 0) {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: localMessages.sort((a, b) => a.createdAt - b.createdAt)
          },
          loadedChannels: {
            ...state.loadedChannels,
            [channelId]: true
          }
        }));
      }

      const parts = groupId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : groupId;

      // Get the channel name from the channel ID by looking it up in the database
      const channel = await db.channels.get(channelId);
      const channelName = channel?.name;

      const events = await client.fetchEvents({
        kinds: [9],
        '#h': [localGroupId],
        limit: 100,
      });

      const messages: Message[] = events
        .filter((event: NostrEvent) => {
          const channelTag = event.tags.find(tag => tag[0] === 'c');
          if (channelTag && channelTag[1] && channelName) {
            return channelTag[1] === channelName;
          }
          return false; // Only include messages that have a proper channel tag
        })
        .map((event: NostrEvent) => ({
          id: event.id,
          channelId,
          authorPubkey: event.pubkey,
          content: event.content,
          createdAt: event.created_at * 1000,
          updatedAt: event.created_at * 1000,
        }));

      if (messages.length > 0) {
        await db.messages.bulkPut(messages);

        const eventIds = messages.map(m => m.id);

        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: messages.sort((a, b) => a.createdAt - b.createdAt)
          },
          recentEventIds: {
            ...state.recentEventIds,
            [channelId]: eventIds.slice(-10)
          },
          loadingChannels: {
            ...state.loadingChannels,
            [channelId]: false
          },
          loadedChannels: {
            ...state.loadedChannels,
            [channelId]: true
          }
        }));
      } else {
        // Even if no messages, mark as loaded and stop loading
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: []
          },
          loadingChannels: {
            ...state.loadingChannels,
            [channelId]: false
          },
          loadedChannels: {
            ...state.loadedChannels,
            [channelId]: true
          }
        }));
      }

      console.log('✅ Loaded', messages.length, 'messages for channel', channelId, '(with channel tag)');
    } catch (error) {
      console.error('Failed to load messages:', error);

      // Stop loading on error
      set((state) => ({
        loadingChannels: {
          ...state.loadingChannels,
          [channelId]: false
        }
      }));
    }
  },

  clearAllMessages: async () => {
    try {
      await db.messages.clear();
      set({
        messages: {},
        recentEventIds: {},
        loadingChannels: {},
        loadedChannels: {}
      });
      console.log('✅ Cleared all messages from database');
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  },

  subscribeToChannel: (channelId, groupId) => {
    const currentState = get();

    // Only allow one active channel subscription at a time to save quota
    if (currentState.activeChannelId && currentState.activeChannelId !== channelId) {
      console.log('🧹 Unsubscribing from previous channel:', currentState.activeChannelId);
      get().unsubscribeFromChannel(currentState.activeChannelId);
    }

    // Check if already subscribed to this channel
    if (currentState.subscriptions[channelId]) {
      console.log('ℹ️ Already subscribed to channel:', channelId);
      set({ activeChannelId: channelId });
      return;
    }

    const subscribeAsync = async () => {
      try {
        console.log('📡 Subscribing to channel:', channelId, 'group:', groupId);

        const client = getGlobalNIP29Client();

        // Ensure connection is stable
        if (!client.isConnected()) {
          console.log('🔌 Message store: Connecting to relay...');
          await client.connect();
        }

        const parts = groupId.split("'");
        const localGroupId = parts.length === 2 ? parts[1] : groupId;

        const now = Math.floor(Date.now() / 1000);

        let subId: string;

        try {
          subId = client.subscribe(
            [
              {
                kinds: [9],
                '#h': [localGroupId],
                since: now,
              },
            ],
            async (event: NostrEvent) => {
            const eventChannelTag = event.tags.find(tag => tag[0] === 'c');
            const eventChannelName = eventChannelTag && eventChannelTag[1] ? eventChannelTag[1] : null;

            if (eventChannelName) {
              // Get the channel name for the current channelId
              const channel = await db.channels.get(channelId);
              const currentChannelName = channel?.name;

              if (eventChannelName !== currentChannelName) {
                return;
              }
            }

            const message: Message = {
              id: event.id,
              channelId,
              authorPubkey: event.pubkey,
              content: event.content,
              createdAt: event.created_at * 1000,
              updatedAt: event.created_at * 1000,
            };

            db.messages.put(message);
            get().addMessage(channelId, message);

            set((state) => {
              const eventIds = state.recentEventIds[channelId] || [];
              return {
                recentEventIds: {
                  ...state.recentEventIds,
                  [channelId]: [...eventIds, event.id].slice(-10)
                }
              };
            });

            console.log('📨 New message received:', event.id);
          }
        );

        set((state) => ({
          subscriptions: {
            ...state.subscriptions,
            [channelId]: subId
          },
          activeChannelId: channelId
        }));

        console.log('📡 Subscribed to channel:', channelId);

        } catch (subscribeError) {
          console.error('❌ Failed to create subscription:', subscribeError);
          throw subscribeError;
        }

      } catch (error) {
        console.error('❌ Failed to subscribe to channel:', error);
        // Don't throw here to prevent breaking the UI
      }
    };

    // Run subscription in background, don't block
    subscribeAsync();
  },

  unsubscribeFromChannel: (channelId) => {
    const currentState = get();
    const subId = currentState.subscriptions[channelId];
    if (!subId) return;

    try {
      const client = getGlobalNIP29Client();
      client.unsubscribe(subId);

      set((state) => {
        const { [channelId]: _, ...restSubs } = state.subscriptions;
        return {
          subscriptions: restSubs,
          activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId
        };
      });

      console.log('🔌 Unsubscribed from channel:', channelId);
    } catch (error) {
      console.error('Failed to unsubscribe from channel:', error);
    }
  },

  clearAllSubscriptions: () => {
    const currentState = get();
    const client = getGlobalNIP29Client();

    console.log(`🧹 Clearing ${Object.keys(currentState.subscriptions).length} message subscriptions`);

    Object.entries(currentState.subscriptions).forEach(([channelId, subId]) => {
      try {
        client.unsubscribe(subId);
        console.log(`🔌 Unsubscribed from channel: ${channelId}`);
      } catch (error) {
        console.error(`Failed to unsubscribe from channel ${channelId}:`, error);
      }
    });

    set({
      subscriptions: {},
      activeChannelId: null
    });

    console.log('✅ All message subscriptions cleared');
  },

  isChannelLoading: (channelId) => {
    return get().loadingChannels[channelId] || false;
  },

  isChannelLoaded: (channelId) => {
    return get().loadedChannels[channelId] || false;
  },

  setChannelLoading: (channelId) => {
    set((state) => ({
      loadingChannels: {
        ...state.loadingChannels,
        [channelId]: true
      }
    }));
  },

  clearChannelMessages: (channelId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: []
      },
      loadedChannels: {
        ...state.loadedChannels,
        [channelId]: false
      }
    }));
  },

  clearAllLoadingStates: () => {
    set((state) => ({
      loadingChannels: {}
    }));
  },
}));
