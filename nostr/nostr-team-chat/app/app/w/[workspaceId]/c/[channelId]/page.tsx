'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChannel } from '@/lib/hooks/use-channels';
import { useChannelMessages } from '@/lib/hooks/use-channel-messages';
import { useChatStore } from '@/lib/stores/chat-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { ChannelView } from '@/components/channels/ChannelView';
import { MessageSkeletons } from '@/components/ui/message-skeleton';

export default function ChannelPage() {
  const params = useParams();
  const router = useRouter();
  const urlWorkspaceId = params.workspaceId as string; // This is the sanitized ID from URL
  const channelId = params.channelId as string;

  const { workspaces } = useWorkspaceStore();
  const { setCurrentChannel, reset: resetChatStore } = useChatStore();

  // Find the actual workspace with the original group ID
  // The URL can contain either sanitized or full workspace IDs
  const workspace = workspaces.find(w => {
    // Try exact match first (for full IDs like "groups.contextio.app'dlpnklmeoft")
    if (w.id === urlWorkspaceId) return true;

    // Try sanitized match (for cases where URL has sanitized ID but workspace has full ID)
    const sanitizedWorkspaceId = w.id.includes("'") ? w.id.split("'")[1] : w.id;
    return sanitizedWorkspaceId === urlWorkspaceId;
  });

  const actualWorkspaceId = workspace?.id || urlWorkspaceId; // Use original group ID if found

  // Update channel ID to use the actual workspace ID if we found a workspace
  const actualChannelId = workspace ? channelId.replace(urlWorkspaceId, workspace.id) : channelId;

  const { channel, isLoading: isChannelLoading } = useChannel(actualChannelId);

  console.log('🔍 Workspace ID mapping:', {
    urlWorkspaceId,
    actualWorkspaceId,
    workspace: workspace ? { id: workspace.id, name: workspace.name } : null,
    channelId,
    actualChannelId
  });

  // Note: Removed "corrupted" workspace/channel ID validation as NIP-29 group IDs
  // can contain dots and quotes (e.g., "groups.contextio.app'dlpnklmeoft")
  // and are valid - we should not clear workspace data for valid group IDs


  const { messages, isLoading, sendMessage } = useChannelMessages(actualChannelId);

  // Set current channel when component mounts
  useEffect(() => {
    if (channelId) {
      console.log('🔄 Setting current channel from URL:', channelId);
      setCurrentChannel(channelId);
    }
  }, [channelId, setCurrentChannel]);

  // Always show skeleton if channel is not available - never show "not found"
  if (!channel) {
    return (
      <div className="flex flex-col h-full">
        {/* Channel header skeleton */}
        <div className="flex-shrink-0 flex h-16 items-center justify-between pl-6 pr-20 bg-white/70 dark:bg-black/70 backdrop-blur-lg z-20">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Message skeletons */}
        <div className="flex-1 overflow-hidden">
          <MessageSkeletons count={3} />
        </div>
      </div>
    );
  }

  // Defensive rendering - always ensure we have valid data
  try {
    return (
      <ChannelView
        channel={channel}
        workspaceId={actualWorkspaceId || ''}
        messages={messages || []}
        isLoading={isLoading}
        onSendMessage={sendMessage}
      />
    );
  } catch (error) {
    console.warn('Error rendering ChannelView:', error);
    // Fallback to skeleton on any error
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 flex h-16 items-center justify-between pl-6 pr-20 bg-white/70 dark:bg-black/70 backdrop-blur-lg z-20">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <MessageSkeletons count={3} />
        </div>
      </div>
    );
  }
}
