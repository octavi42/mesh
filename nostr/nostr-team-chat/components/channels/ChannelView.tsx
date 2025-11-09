'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useGroupMembers } from '@/lib/hooks/use-group-members';
import { UserAvatars } from '@/components/ui/user-avatars';
import { MessageSkeletons } from '@/components/ui/message-skeleton';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import type { Channel } from '@/lib/db/schema';
import type { Message } from '@/lib/hooks/use-channel-messages';

interface ChannelViewProps {
  channel: Channel;
  workspaceId: string;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string, replyToId?: string) => Promise<void>;
}

export function ChannelView({
  channel,
  workspaceId,
  messages,
  isLoading,
  onSendMessage
}: ChannelViewProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isLoadingChannel, isNavigating } = useChatStore();
  const { pubkey } = useAuthStore();

  // Get group members for the current workspace
  const {
    getAvatarUsers,
    loading: membersLoading,
    isAdmin,
    displayedMemberCount
  } = useGroupMembers({
    groupId: workspaceId || undefined,
    autoRefresh: true,
    refreshInterval: 60000 // Refresh every minute
  });

  // Set initializing to false when we have messages or when loading is complete
  useEffect(() => {
    if (messages.length > 0 || (!isLoading && !isLoadingChannel)) {
      setIsInitializing(false);
    }
  }, [messages.length, isLoading, isLoadingChannel]);

  // Reset initializing state whenever channel changes
  useEffect(() => {
    console.log(`🔄 Channel changed to: ${channel.id}, setting isInitializing=true`);
    setIsInitializing(true);
  }, [channel.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback((content: string) => {
    if (!workspaceId) return;
    onSendMessage(content);
  }, [onSendMessage, workspaceId]);

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
          <div className="flex items-center gap-2">
            {displayedMemberCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {displayedMemberCount} other member{displayedMemberCount !== 1 ? 's' : ''}
              </span>
            )}
            <UserAvatars
              users={getAvatarUsers()}
              size={40}
              maxVisible={5}
              isAdmin={isAdmin(pubkey || '')}
              showInviteButton={true}
            />
          </div>
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
          const shouldShowSkeleton = isNavigating || isInitializing || (isLoading && messages.length === 0) || isLoadingChannel;
          const hasMessages = messages.length > 0;
          const isEmpty = !isLoading && !isLoadingChannel && messages.length === 0;

          // Debug logging to understand the loading state
          console.log('🎭 ChannelView render logic:', {
            channelId: channel.id,
            isNavigating,
            isInitializing,
            isLoading,
            isLoadingChannel,
            messagesCount: messages.length,
            shouldShowSkeleton,
            hasMessages,
            isEmpty
          });

          if (shouldShowSkeleton) {
            return <MessageSkeletons count={3} />;
          } else if (hasMessages) {
            // Convert messages to the expected format for MessageList
            const convertedMessages = messages.map(msg => ({
              ...msg,
              updatedAt: msg.createdAt, // Add the updatedAt field that db schema expects
              isPending: msg.isPending || false // Add isPending field for loading state
            }));
            return <MessageList messages={convertedMessages} currentUserPubkey={pubkey || undefined} />;
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
          disabled={!workspaceId || !pubkey || isLoading}
        />
      </div>
    </div>
  );
}