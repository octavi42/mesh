import { useEffect, useState } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { NDKKind } from '@nostr-dev-kit/ndk';
import { toast } from 'sonner';

export interface Message {
  id: string;
  channelId: string;
  content: string;
  authorPubkey: string;
  createdAt: number;
  replyTo?: string;
  isPending?: boolean;
}

export function useChannelMessages(channelId: string) {
  const { ndk, publish, isConnected } = useNDK();
  const { pubkey } = useAuthStore();
  const { setLoadingChannel } = useChatStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🔧 useChannelMessages effect triggered:', {
      channelId,
      hasNdk: !!ndk,
      isConnected,
      ndkStatus: ndk ? 'available' : 'missing'
    });

    if (!ndk || !channelId || !isConnected) {
      console.log('⏭️ Skipping channel messages subscription: missing requirements', {
        hasNdk: !!ndk,
        hasChannelId: !!channelId,
        isConnected
      });
      return;
    }

    // Add detailed relay status check for debugging
    console.log('🔍 Detailed relay status check:', {
      relays: Array.from(ndk.pool.relays.values()).map(r => ({
        url: r.url,
        status: r.status,
        authenticated: r.authenticated,
        connectivity: r.connectivity?.status
      }))
    });

    console.log('💬 Starting channel messages fetching for channel:', channelId);
    setIsLoading(true);
    setMessages([]); // Clear previous messages

    // Parse channel ID to extract workspace (group) ID and channel name
    // Format: "workspaceId-channelName" e.g. "x6i0xmzzxui-general"
    const parts = channelId.split('-');
    if (parts.length < 2) {
      console.error('❌ Invalid channel ID format:', channelId);
      setIsLoading(false);
      setLoadingChannel(false); // Clear chat store loading state on error
      return;
    }

    const workspaceId = parts[0]; // This is the group ID from NIP-29
    const channelName = parts.slice(1).join('-'); // Channel name (rejoin in case of multiple dashes)

    console.log('💬 Parsed channel info:', {
      channelId,
      workspaceId,
      channelName,
      parts,
      fullChannelId: channelId
    });

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
            // Avoid duplicates - check by ID first, then by content and author for optimistic messages
            const existsById = prev.find(m => m.id === message.id);
            if (existsById) return prev;

            // Also check for optimistic messages that might have the same content and author
            // within a short time window (to catch race conditions)
            const existsByContentAndAuthor = prev.find(m =>
              m.content === message.content &&
              m.authorPubkey === message.authorPubkey &&
              Math.abs(m.createdAt - message.createdAt) < 10000 // within 10 seconds
            );
            if (existsByContentAndAuthor) return prev;

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
        // Verify relay authentication before proceeding
        const authenticatedRelays = Array.from(ndk.pool.relays.values()).filter(r => r.status === 5);
        if (authenticatedRelays.length === 0) {
          console.error('❌ No authenticated relays available for message fetching');
          console.log('Available relays:', Array.from(ndk.pool.relays.values()).map(r => ({
            url: r.url,
            status: r.status,
            authenticated: r.authenticated
          })));
          setIsLoading(false);
          setLoadingChannel(false); // Clear chat store loading state on error
          return;
        }

        console.log('✅ Found authenticated relays:', authenticatedRelays.map(r => r.url));

        // PHASE 1: HISTORICAL MESSAGES FETCH (like working test app)
        console.log('📜 PHASE 1: Fetching historical messages...');

        const filter = {
          kinds: [9, 11] as NDKKind[], // GroupChatMessage (NIP-29) and EncryptedDM
          "#h": [workspaceId], // Filter by group ID
          limit: 250 // Match working test app limit
        };

        console.log('📜 Message fetch filter:', filter);

        const historicalMessages = await ndk.fetchEvents(filter);

        console.log(`📜 Fetched ${historicalMessages.size} historical messages for group ${workspaceId}:`, {
          filter,
          relayStatuses: Array.from(ndk.pool.relays.values()).map(r => ({
            url: r.url,
            status: r.status,
            authenticated: r.authenticated
          })),
          messagesArray: Array.from(historicalMessages).map(e => ({
            id: e.id?.slice(0, 8),
            kind: e.kind,
            content: e.content?.slice(0, 50),
            tags: e.tags,
            groupId: e.tags.find((tag: string[]) => tag[0] === 'h')?.[1],
            channelName: e.tags.find((tag: string[]) => tag[0] === 'c')?.[1],
            relay: e.relay?.url
          }))
        });

        // Check if we got any messages and log potential issues
        if (historicalMessages.size === 0) {
          console.warn('⚠️ No historical messages fetched. Possible issues:');
          console.warn('- Authentication may have failed');
          console.warn('- Group ID may be incorrect:', workspaceId);
          console.warn('- No messages exist for this group/channel combination');
          console.warn('- Relay may be rejecting requests');
        }

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

        const liveFilter = {
          kinds: [9, 11] as NDKKind[], // GroupChatMessage (NIP-29) and EncryptedDM
          "#h": [workspaceId], // Filter by group ID
          since: latestTimestamp + 1 // Only new messages after historical data
        };

        console.log('🔴 Live subscription filter:', liveFilter);

        const liveSubscription = ndk.subscribe(liveFilter);

        if (!liveSubscription) {
          console.warn('⚠️ Could not create live message subscription - NDK not ready');
          setIsLoading(false);
          setLoadingChannel(false); // Clear chat store loading state on error
          return;
        }

        // Handle live messages
        liveSubscription.on('event', (event) => {
          processMessage(event, true);
        });

        liveSubscription.on('eose', () => {
          console.log('✅ Live message subscription EOSE - real-time messages active');
          setIsLoading(false);
          setLoadingChannel(false); // Clear chat store loading state
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
        setLoadingChannel(false); // Clear chat store loading state on error
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

    // STEP 1: IMMEDIATE optimistic update with loading state
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      channelId,
      content,
      authorPubkey: pubkey,
      createdAt: Date.now(),
      replyTo,
      isPending: true
    };

    // Add optimistic message immediately
    setMessages(prev => {
      const updated = [...prev, optimisticMessage].sort((a, b) => a.createdAt - b.createdAt);
      return updated;
    });

    // STEP 2: Handle actual sending in background
    try {
      const { NDKEvent } = await import('@nostr-dev-kit/ndk');
      const messageEvent = new NDKEvent(ndk);
      messageEvent.kind = 9; // GroupChatMessage (NIP-29)
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

      // Update the optimistic message with the real event ID to prevent duplicates
      // from the live subscription, but keep everything else the same to avoid flickering
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, id: messageEvent.id || tempId }
            : msg
        )
      );

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);

      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));

      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to send message: ${errorMessage}`);

      // Don't throw error to prevent breaking the UI
    }
  };

  return {
    messages,
    isLoading,
    sendMessage
  };
}
