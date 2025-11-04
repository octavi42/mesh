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
  const workspaceId = params.workspaceId as string;
  const channelId = params.channelId as string;

  const { workspaces, clearWorkspaces } = useWorkspaceStore();
  const channel = useChannel(channelId);
  const { setCurrentChannel, reset: resetChatStore } = useChatStore();

  // Note: Removed "corrupted" workspace/channel ID validation as NIP-29 group IDs
  // can contain dots and quotes (e.g., "groups.contextio.app'dlpnklmeoft")
  // and are valid - we should not clear workspace data for valid group IDs

  const { messages, isLoading, sendMessage } = useChannelMessages(channelId);

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
      workspaceId={workspaceId}
      messages={messages}
      isLoading={isLoading}
      onSendMessage={sendMessage}
    />
  );
}
