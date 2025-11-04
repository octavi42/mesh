import { useEffect, useState } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { NDKKind } from '@nostr-dev-kit/ndk';

export interface Message {
  id: string;
  channelId: string;
  content: string;
  authorPubkey: string;
  createdAt: number;
  replyTo?: string;
}

export function useChannelMessages(channelId: string) {
  const { ndk, publish, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const { setLoadingChannel } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!ndk || !channelId || !isConnected) {
      console.log('⏭️ Skipping channel messages subscription: missing requirements', {
        hasNdk: !!ndk,
        hasChannelId: !!channelId,
        isConnected
      });
      return;
    }

    console.log('💬 Starting channel messages fetching for channel:', channelId);
    setIsLoading(true);
    setMessages([]); // Clear previous messages

    // Parse channel ID to extract workspace (group) ID and channel name
    // Format: "workspaceId-channelName" e.g. "x6i0xmzzxui-general"
    const parts = channelId.split('-');
    if (parts.length < 2) {
      console.error('❌ Invalid channel ID format:', channelId);
      setIsLoading(false);
      return;
    }

    const workspaceId = parts[0]; // This is the group ID from NIP-29
    const channelName = parts.slice(1).join('-'); // Channel name (rejoin in case of multiple dashes)

    console.log('💬 Parsed channel info:', { workspaceId, channelName });

    const processMessage = (event: any, isLive = false) => {
      try {
        const logPrefix = isLive ? '🔴 LIVE MSG' : '📜 HISTORICAL MSG';

        console.log(`${logPrefix} Received message event:`, {
          id: event.id?.slice(0, 8),
          kind: event.kind,
          groupId: event.tags.find((tag: string[]) => tag[0] === 'h')?.[1],
          channelName: event.tags.find((tag: string[]) => tag[0] === 'c')?.[1],
          author: event.pubkey?.slice(0, 8),
          content: event.content?.slice(0, 50),
          relay: event.relay?.url
        });

        // Extract group ID and channel name from tags
        const messageGroupId = event.tags.find((tag: string[]) => tag[0] === 'h')?.[1];
        const messageChannelName = event.tags.find((tag: string[]) => tag[0] === 'c')?.[1] || 'general';

        // Filter messages for this specific group and channel
        if (messageGroupId === workspaceId && messageChannelName === channelName) {
          const message: Message = {
            id: event.id || `${Date.now()}-${Math.random()}`,
            channelId: channelId,
            content: event.content || '',
            authorPubkey: event.pubkey || '',
            createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
            replyTo: event.tags.find((tag: string[]) => tag[0] === 'e')?.[1]
          };

          console.log(`${logPrefix} Adding message to channel:`, {
            messageId: message.id.slice(0, 8),
            channelId: message.channelId,
            author: message.authorPubkey.slice(0, 8),
            content: message.content.slice(0, 30)
          });

          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.find(m => m.id === message.id);
            if (exists) return prev;

            // Add and sort by timestamp
            const updated = [...prev, message].sort((a, b) => a.createdAt - b.createdAt);
            return updated;
          });
        }
      } catch (error) {
        console.error('❌ Failed to process message event:', error);
      }
    };

    const initializeMessages = async () => {
      try {
        // PHASE 1: HISTORICAL MESSAGES FETCH (like working test app)
        console.log('📜 PHASE 1: Fetching historical messages...');

        const historicalMessages = await ndk.fetchEvents({
          kinds: [1, 11] as NDKKind[], // TextNote and EncryptedDM (standard message kinds)
          "#h": [workspaceId], // Filter by group ID
          limit: 250 // Match working test app limit
        });

        console.log(`📜 Fetched ${historicalMessages.size} historical messages for group ${workspaceId}`);

        let latestTimestamp = 0;

        // Process historical messages
        historicalMessages.forEach((event) => {
          processMessage(event, false);
          if (event.created_at && event.created_at > latestTimestamp) {
            latestTimestamp = event.created_at;
          }
        });

        console.log('📜 Historical messages processing complete');

        // PHASE 2: LIVE SUBSCRIPTION (like working test app)
        console.log('🔴 PHASE 2: Starting live message subscription...');

        const liveSubscription = ndk.subscribe({
          kinds: [1, 11] as NDKKind[], // TextNote and EncryptedDM
          "#h": [workspaceId], // Filter by group ID
          since: latestTimestamp + 1 // Only new messages after historical data
        });

        if (!liveSubscription) {
          console.warn('⚠️ Could not create live message subscription - NDK not ready');
          setIsLoading(false);
          return;
        }

        // Handle live messages
        liveSubscription.on('event', (event) => {
          processMessage(event, true);
        });

        liveSubscription.on('eose', () => {
          console.log('✅ Live message subscription EOSE - real-time messages active');
          setIsLoading(false);
        });

        // Cleanup function
        return () => {
          console.log('🛑 Stopping message subscriptions for channel:', channelId);
          try {
            liveSubscription.stop();
          } catch (error) {
            console.log('Error stopping message subscription:', error);
          }
        };

      } catch (error) {
        console.error('❌ Failed to fetch messages:', error);
        setIsLoading(false);
      }
    };

    // Start the two-phase message initialization
    initializeMessages();

    // Return empty cleanup since initializeMessages handles its own cleanup
    return () => {
      console.log('🛑 Cleanup triggered for channel:', channelId);
    };
  }, [ndk, channelId, isConnected]);

  const sendMessage = async (content: string, replyTo?: string) => {
    if (!ndk || !pubkey) {
      throw new Error('NDK or user not available');
    }

    // Parse channel ID to get workspace and channel
    const parts = channelId.split('-');
    if (parts.length < 2) {
      throw new Error('Invalid channel ID format');
    }

    const workspaceId = parts[0];
    const channelName = parts.slice(1).join('-');

    console.log('📤 Sending message:', { workspaceId, channelName, content: content.slice(0, 30) });

    try {
      const { NDKEvent } = await import('@nostr-dev-kit/ndk');
      const messageEvent = new NDKEvent(ndk);
      messageEvent.kind = 1; // TextNote
      messageEvent.content = content;
      messageEvent.tags = [
        ['h', workspaceId], // Group ID
        ['c', channelName]  // Channel name
      ];

      if (replyTo) {
        messageEvent.tags.push(['e', replyTo]);
      }

      await messageEvent.sign();
      await messageEvent.publish();

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  };

  return {
    messages,
    isLoading,
    sendMessage
  };
}
