'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChannel } from '@/lib/hooks/use-channels';
import { useChannelMessages } from '@/lib/hooks/use-channel-messages';
import { useChatStore } from '@/lib/stores/chat-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { ChannelView } from '@/components/channels/ChannelView';

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

  const channel = useChannel(actualChannelId);

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

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Channel Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The channel "{channelId}" could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChannelView
      channel={channel}
      workspaceId={actualWorkspaceId}
      messages={messages}
      isLoading={isLoading}
      onSendMessage={sendMessage}
    />
  );
}
