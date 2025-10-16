'use client';

import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelView } from '@/components/chat/ChannelView';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChannels } from '@/lib/hooks/use-channels';
import { seedMockData } from '@/lib/db/schema';

export default function HomePage() {
  const { currentChannelId, setCurrentChannel, currentWorkspaceId } = useChatStore();
  const channels = useChannels(currentWorkspaceId);

  useEffect(() => {
    seedMockData();
  }, []);

  useEffect(() => {
    if (channels && channels.length > 0 && !currentChannelId) {
      setCurrentChannel(channels[0].id);
    }
  }, [channels, currentChannelId, setCurrentChannel]);

  if (!currentChannelId) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Welcome to Nostr Team Chat
            </h1>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Decentralized team collaboration powered by Nostr
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ChannelView channelId={currentChannelId} />
    </AppLayout>
  );
}
