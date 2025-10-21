import { create } from 'zustand';
import { db, type Message } from '@/lib/db/schema';
import { getGlobalNIP29Client } from '@/lib/nostr/nip29';
import type { NostrEvent } from '@/lib/nostr/nip29/types';

interface MessageStore {
  messages: Record<string, Message[]>;
  recentEventIds: Record<string, string[]>;
  subscriptions: Record<string, string>;

  getMessages: (channelId: string) => Message[];
  sendMessage: (groupId: string, channelId: string, content: string) => Promise<void>;
  addMessage: (channelId: string, message: Message) => void;
  loadMessages: (channelId: string, groupId: string) => Promise<void>;
  subscribeToChannel: (channelId: string, groupId: string) => void;
  unsubscribeFromChannel: (channelId: string) => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: {},
  recentEventIds: {},
  subscriptions: {},

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

      const tags: string[][] = [
        ['h', localGroupId],
        ['channel', channelId]
      ];

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
    try {
      const client = getGlobalNIP29Client();

      if (!client.isConnected()) {
        await client.connect();
      }

      const localMessages = await db.messages.where('channelId').equals(channelId).toArray();

      if (localMessages.length > 0) {
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: localMessages.sort((a, b) => a.createdAt - b.createdAt)
          }
        }));
      }

      const parts = groupId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : groupId;

      const events = await client.fetchEvents({
        kinds: [9],
        '#h': [localGroupId],
        '#channel': [channelId],
        limit: 100,
      });

      const messages: Message[] = events.map((event: NostrEvent) => ({
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
          }
        }));
      }

      console.log('✅ Loaded', messages.length, 'messages for channel', channelId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  },

  subscribeToChannel: async (channelId, groupId) => {
    const existingSub = get().subscriptions[channelId];
    if (existingSub) return;

    try {
      const client = getGlobalNIP29Client();

      if (!client.isConnected()) {
        await client.connect();
      }

      const parts = groupId.split("'");
      const localGroupId = parts.length === 2 ? parts[1] : groupId;

      const now = Math.floor(Date.now() / 1000);

      const subId = client.subscribe(
        [
          {
            kinds: [9],
            '#h': [localGroupId],
            '#channel': [channelId],
            since: now,
          },
        ],
        (event: NostrEvent) => {
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
        }
      }));

      console.log('📡 Subscribed to channel:', channelId);
    } catch (error) {
      console.error('Failed to subscribe to channel:', error);
    }
  },

  unsubscribeFromChannel: (channelId) => {
    const subId = get().subscriptions[channelId];
    if (!subId) return;

    try {
      const client = getGlobalNIP29Client();
      client.unsubscribe(subId);

      set((state) => {
        const { [channelId]: _, ...restSubs } = state.subscriptions;
        return { subscriptions: restSubs };
      });

      console.log('🔌 Unsubscribed from channel:', channelId);
    } catch (error) {
      console.error('Failed to unsubscribe from channel:', error);
    }
  },
}));
