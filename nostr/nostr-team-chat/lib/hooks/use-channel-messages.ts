import { useEffect, useState } from 'react';
import { useNDK } from './use-ndk';
import { useAuthStore } from '@/lib/stores/auth-store';
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
  const { ndk, publish } = useNDK();
  const { pubkey } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!ndk || !channelId) {
      console.log('⏭️ Skipping channel messages subscription: missing ndk or channelId');
      return;
    }

    console.log('💬 Starting channel messages subscription for channel:', channelId);
    setIsLoading(true);
    setMessages([]); // Clear previous messages

    try {
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

      // Subscribe to group messages for this specific channel
      const subscription = ndk.subscribe({
        kinds: [9 as NDKKind], // NIP-29 group messages (kind 9)
        '#h': [workspaceId], // Group ID (h tag)
        '#c': [channelName], // Channel name (c tag)
        limit: 100
      });

      subscription.on('event', (event) => {
        try {
          console.log('💬 Received message event:', {
            id: event.id?.slice(0, 8),
            groupId: event.tags.find(tag => tag[0] === 'h')?.[1],
            channelName: event.tags.find(tag => tag[0] === 'c')?.[1],
            author: event.pubkey?.slice(0, 8),
            content: event.content?.slice(0, 50)
          });

          // Verify this message is for our group and channel
          const messageGroupId = event.tags.find(tag => tag[0] === 'h')?.[1];
          const messageChannelName = event.tags.find(tag => tag[0] === 'c')?.[1];

          if (messageGroupId !== workspaceId || messageChannelName !== channelName) {
            console.log('⏭️ Message not for current channel, skipping');
            return;
          }

          // Extract reply-to from 'e' tags (if any)
          const replyToTag = event.tags.find(tag => tag[0] === 'e');
          const replyTo = replyToTag ? replyToTag[1] : undefined;

          const message: Message = {
            id: event.id!,
            channelId: channelId, // Use our combined channel ID
            content: event.content || '',
            authorPubkey: event.pubkey!,
            createdAt: event.created_at ? event.created_at * 1000 : Date.now(),
            replyTo
          };

          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.some(m => m.id === message.id);
            if (exists) return prev;

            // Insert in chronological order
            const newMessages = [...prev, message];
            return newMessages.sort((a, b) => a.createdAt - b.createdAt);
          });
        } catch (error) {
          console.error('❌ Failed to process message event:', error);
        }
      });

      subscription.on('eose', () => {
        console.log('✅ Channel messages subscription EOSE');
        setIsLoading(false);
      });

      subscription.on('close', () => {
        console.log('🔌 Channel messages subscription closed');
        setIsLoading(false);
      });

      // Cleanup function
      return () => {
        console.log('🛑 Stopping channel messages subscription');
        subscription.stop();
        setIsLoading(false);
      };

    } catch (error) {
      console.error('❌ Failed to create channel messages subscription:', error);
      setIsLoading(false);
    }
  }, [ndk, channelId]);

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!ndk || !pubkey || !channelId) {
      throw new Error('Cannot send message: missing requirements');
    }

    console.log('📤 Sending message to channel:', channelId);

    try {
      // Parse channel ID to extract workspace (group) ID and channel name
      const parts = channelId.split('-');
      if (parts.length < 2) {
        throw new Error('Invalid channel ID format');
      }

      const workspaceId = parts[0]; // This is the group ID from NIP-29
      const channelName = parts.slice(1).join('-'); // Channel name

      const { NDKEvent } = await import('@nostr-dev-kit/ndk');

      const messageEvent = new NDKEvent(ndk);
      messageEvent.kind = 9; // NIP-29 group message
      messageEvent.content = content;
      messageEvent.tags = [
        ['h', workspaceId], // Group ID (h tag)
        ['c', channelName], // Channel name (c tag)
      ];

      // Add reply-to tag if this is a reply
      if (replyToId) {
        messageEvent.tags.push(['e', replyToId]); // Reply reference
      }

      await publish(messageEvent);

      console.log('✅ Message sent successfully:', {
        id: messageEvent.id,
        workspaceId,
        channelName,
        replyTo: replyToId
      });
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