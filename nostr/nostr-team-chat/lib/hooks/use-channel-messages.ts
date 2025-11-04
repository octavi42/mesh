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

      // Subscribe to ALL group messages (kind 9) and filter client-side
      // This matches the working test implementation
      const subscription = ndk.subscribe({
        kinds: [9 as NDKKind], // All group messages (kind 9)
        limit: 100 // Get recent messages
      });

      subscription.on('event', (event) => {
        try {
          console.log('💬 Received message event:', {
            id: event.id?.slice(0, 8),
            kind: event.kind,
            groupId: event.tags.find(tag => tag[0] === 'h')?.[1],
            channelName: event.tags.find(tag => tag[0] === 'c')?.[1],
            author: event.pubkey?.slice(0, 8),
            content: event.content?.slice(0, 50),
            tags: event.tags,
            relay: event.relay?.url
          });

          // Extract group ID and channel name from tags
          const messageGroupId = event.tags.find(tag => tag[0] === 'h')?.[1];
          const messageChannelName = event.tags.find(tag => tag[0] === 'c')?.[1] || 'general'; // Default to general if no channel

          // Only process messages for our specific group
          if (messageGroupId !== workspaceId) {
            console.log('⏭️ Message not for current group, skipping:', {
              messageGroup: messageGroupId,
              expectedGroup: workspaceId
            });
            return;
          }

          // For channel filtering: if we're looking for 'general' channel, accept messages with no channel tag OR 'general' tag
          // For other channels, require exact match
          const isCorrectChannel = channelName === 'general'
            ? (messageChannelName === 'general' || messageChannelName === undefined)
            : messageChannelName === channelName;

          if (!isCorrectChannel) {
            console.log('⏭️ Message not for current channel, skipping:', {
              messageChannel: messageChannelName,
              expectedChannel: channelName,
              isGeneral: channelName === 'general'
            });
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
            if (exists) {
              console.log('💬 Message already exists, skipping duplicate');
              return prev;
            }

            // Insert in chronological order
            const newMessages = [...prev, message];
            const sortedMessages = newMessages.sort((a, b) => a.createdAt - b.createdAt);
            console.log('💬 Updated messages array:', {
              previousCount: prev.length,
              newCount: sortedMessages.length,
              newMessage: {
                id: message.id?.slice(0, 8),
                content: message.content?.slice(0, 50),
                author: message.authorPubkey?.slice(0, 8)
              }
            });
            return sortedMessages;
          });
        } catch (error) {
          console.error('❌ Failed to process message event:', error);
        }
      });

      subscription.on('eose', () => {
        console.log('✅ Channel messages subscription EOSE');
        setIsLoading(false);
        setLoadingChannel(false); // Clear global loading state
      });

      subscription.on('close', () => {
        console.log('🔌 Channel messages subscription closed');
        setIsLoading(false);
        setLoadingChannel(false); // Clear global loading state
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
  }, [ndk, channelId, isConnected]);

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
      messageEvent.kind = 9; // Standard group chat message (kind 9)
      messageEvent.content = content;
      messageEvent.tags = [
        ['h', workspaceId], // NIP-29 group ID (h tag)
      ];

      // Add channel tag only if not the default 'general' channel
      if (channelName !== 'general') {
        messageEvent.tags.push(['c', channelName]); // Channel name (c tag)
      }

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