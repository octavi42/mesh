'use client';

import { useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelView } from '@/components/chat/ChannelView';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChannels } from '@/lib/hooks/use-channels';
import { seedMockData } from '@/lib/db/schema';

export default function HomePage() {
  const { currentChannelId, setCurrentChannel, currentWorkspaceId, setCurrentWorkspace } = useChatStore();
  const channels = useChannels(currentWorkspaceId);

  useEffect(() => {
    seedMockData();
  }, []);

  useEffect(() => {
    if (channels && channels.length > 0 && !currentChannelId) {
      const firstChannel = channels[0];
      setCurrentChannel(firstChannel.id);

      if (typeof window !== 'undefined') {
        const url = `/w/${currentWorkspaceId}/c/${firstChannel.id}`;
        window.history.replaceState({}, '', url);
      }
    }
  }, [channels, currentChannelId, setCurrentChannel, currentWorkspaceId]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const workspaceMatch = path.match(/\/w\/([^/]+)/);
      const channelMatch = path.match(/\/c\/([^/]+)/);

      if (workspaceMatch && workspaceMatch[1] !== currentWorkspaceId) {
        setCurrentWorkspace(workspaceMatch[1]);
      }

      if (channelMatch && channelMatch[1] !== currentChannelId) {
        setCurrentChannel(channelMatch[1]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentWorkspaceId, currentChannelId, setCurrentWorkspace, setCurrentChannel]);

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
      <ChannelView key={currentChannelId} channelId={currentChannelId} />
    </AppLayout>
  );
}
