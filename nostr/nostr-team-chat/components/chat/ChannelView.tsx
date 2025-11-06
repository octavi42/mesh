'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useChannel } from '@/lib/hooks/use-channels';
import { UserAvatars } from '@/components/ui/user-avatars';
import { MessageSkeletons } from '@/components/ui/message-skeleton';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessageStore } from '@/lib/stores/message-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGroupMembers } from '@/lib/hooks/use-group-members';

interface ChannelViewProps {
  channelId: string;
}


export function ChannelView({ channelId }: ChannelViewProps) {
  const channel = useChannel(channelId);
  const { currentWorkspaceId, isNavigating } = useChatStore();
  const { pubkey } = useAuthStore();

  // Get group members for the current workspace
  const {
    getAvatarUsers,
    loading: membersLoading,
    isAdmin,
    displayedMemberCount
  } = useGroupMembers({
    groupId: currentWorkspaceId || undefined,
    autoRefresh: true,
    refreshInterval: 60000 // Refresh every minute
  });
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

  // Set initializing to false when we have messages or when loading is complete
  useEffect(() => {
    if (messages.length > 0 || (loaded && !loading)) {
      setIsInitializing(false);
    }
  }, [messages.length, loaded, loading]);

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
      // Don't clear messages immediately - let loadMessages handle it for better UX
      messageStore.setChannelLoading(channelId);
      console.log('🔄 ChannelView: Set loading state for channel', channelId);
    } else {
      console.log('🔄 ChannelView: Loading state already set for channel', channelId);
    }

    // Start loading and subscribing immediately in background - don't block UI
    loadMessages(channelId, currentWorkspaceId).catch(console.error);
    subscribeToChannel(channelId, currentWorkspaceId);

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
      {/* Header with channel name and user avatars - Fixed */}
      <div className="flex-shrink-0 flex h-16 items-center justify-between pl-6 pr-20 bg-white/70 dark:bg-black/70 backdrop-blur-lg z-20">
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
          {displayedMemberCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {displayedMemberCount} other member{displayedMemberCount !== 1 ? 's' : ''}
              </span>
              <UserAvatars
                users={getAvatarUsers()}
                size={40}
                maxVisible={5}
                isAdmin={isAdmin(pubkey || '')}
              />
            </div>
          )}
          {membersLoading && displayedMemberCount === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Loading members...</span>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
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
              <div className="flex items-center justify-center h-full">
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

      {/* Fixed Footer */}
      <div className="flex-shrink-0 z-20">
        <MessageInput
          channelName={channel.name}
          onSend={handleSendMessage}
          disabled={!currentWorkspaceId || !pubkey || loading}
        />
      </div>
    </div>
  );
}
