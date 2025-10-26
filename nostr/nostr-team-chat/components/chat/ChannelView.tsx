'use client';

import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useChannel } from '@/lib/hooks/use-channels';
import { UserAvatars } from '@/components/ui/user-avatars';
import { MessageSkeletons } from '@/components/ui/message-skeleton';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessageStore } from '@/lib/stores/message-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';

interface ChannelViewProps {
  channelId: string;
}

// Mock users data - replace with real workspace members later
const mockUsers = [
  { id: 1, name: 'Alice', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', pubkey: 'npub1alice123456789' },
  { id: 2, name: 'Bob', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', pubkey: 'npub1bob123456789' },
  { id: 3, name: 'Carol', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', pubkey: 'npub1carol123456789' },
  { id: 4, name: 'David', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', pubkey: 'npub1david123456789' },
  { id: 5, name: 'Eve', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve', pubkey: 'npub1eve123456789' },
  { id: 6, name: 'Frank', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank', pubkey: 'npub1frank123456789' },
  { id: 7, name: 'Grace', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace', pubkey: 'npub1grace123456789' },
  { id: 8, name: 'Henry', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Henry', pubkey: 'npub1henry123456789' },
];

export function ChannelView({ channelId }: ChannelViewProps) {
  const channel = useChannel(channelId);
  const { currentWorkspaceId, isNavigating } = useChatStore();
  const { pubkey } = useAuthStore();
  // Get static references to prevent re-renders
  const sendMessage = useMessageStore.getState().sendMessage;
  const loadMessages = useMessageStore.getState().loadMessages;
  const subscribeToChannel = useMessageStore.getState().subscribeToChannel;
  const unsubscribeFromChannel = useMessageStore.getState().unsubscribeFromChannel;

  // Subscribe to reactive state changes
  const messages = useMessageStore((state) => state.messages[channelId]) || [];
  const loading = useMessageStore((state) => state.loadingChannels[channelId]) || false;
  const loaded = useMessageStore((state) => state.loadedChannels[channelId]) || false;
  const initializingRef = useRef<string | null>(null);

  // Local state to force skeleton on component mount - always start as true when component mounts
  const [isInitializing, setIsInitializing] = useState(true);

  // Reset initializing state whenever channelId changes - this should run immediately
  useEffect(() => {
    console.log(`🔄 Channel changed to: ${channelId}, setting isInitializing=true`);
    setIsInitializing(true);
  }, [channelId]);

  useEffect(() => {
    if (!currentWorkspaceId || !channelId) {
      return;
    }

    const key = `${currentWorkspaceId}-${channelId}`;

    // Prevent multiple concurrent initializations for the same channel
    if (initializingRef.current === key) {
      return;
    }

    initializingRef.current = key;
    console.log('🔄 ChannelView: Initializing channel', channelId);

    // Check if loading state is already set (e.g., from ChannelLink click)
    const messageStore = useMessageStore.getState();
    const isAlreadyLoading = messageStore.loadingChannels[channelId];

    if (!isAlreadyLoading) {
      // Only set loading state if not already set (for direct navigation cases)
      messageStore.clearChannelMessages(channelId);
      messageStore.setChannelLoading(channelId);
      console.log('🔄 ChannelView: Set loading state for channel', channelId);
    } else {
      console.log('🔄 ChannelView: Loading state already set for channel', channelId);
    }

    // Start loading and subscribing immediately in background - don't block UI
    Promise.all([
      loadMessages(channelId, currentWorkspaceId),
      Promise.resolve(subscribeToChannel(channelId, currentWorkspaceId))
    ]).then(() => {
      // Small delay to ensure messages are rendered before hiding skeleton
      setTimeout(() => {
        const currentMessages = useMessageStore.getState().messages[channelId] || [];
        if (currentMessages.length > 0 || useMessageStore.getState().loadedChannels[channelId]) {
          setIsInitializing(false);
        }
      }, 50);
    }).catch(console.error);

    return () => {
      initializingRef.current = null;
      unsubscribeFromChannel(channelId);
    };
  }, [channelId, currentWorkspaceId]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentWorkspaceId) return;
    await sendMessage(currentWorkspaceId, channelId, content);
  }, [sendMessage, currentWorkspaceId, channelId]);

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Channel not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black">
      {/* Header with channel name and user avatars */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 pl-6 pr-20 dark:border-gray-900 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg text-gray-400">#</span>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-medium text-gray-900 dark:text-white">
              {channel.name}
            </h1>
          </div>
          {channel.description && (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {channel.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <UserAvatars users={mockUsers} size={40} maxVisible={5} />
        </div>
      </div>

      <div className="flex-1 relative">
        {(() => {
          // Simplified logic with clear priorities to prevent flickering
          const shouldShowSkeleton = isNavigating || isInitializing || (loading && messages.length === 0);
          const hasMessages = messages.length > 0;
          const isEmpty = loaded && messages.length === 0;

          if (shouldShowSkeleton) {
            return <MessageSkeletons count={3} />;
          } else if (hasMessages) {
            return <MessageList messages={messages} currentUserPubkey={pubkey || undefined} />;
          } else if (isEmpty) {
            return (
              <div className="flex flex-1 items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              </div>
            );
          } else {
            // Fallback to skeleton
            return <MessageSkeletons count={3} />;
          }
        })()}
      </div>

      <MessageInput
        channelName={channel.name}
        onSend={handleSendMessage}
        disabled={!currentWorkspaceId || !pubkey || loading}
      />
    </div>
  );
}
