'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelView } from '@/components/chat/ChannelView';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChannels } from '@/lib/hooks/use-channels';
import { seedMockData } from '@/lib/db/schema';
import { useSecureAuth } from '@/lib/hooks/use-secure-auth';

export default function AppPage() {
  const router = useRouter();
  const { isValidating, isValid } = useSecureAuth(true);
  const nostrLoginInitialized = useRef(false);
  const { currentChannelId, setCurrentChannel, currentWorkspaceId, setCurrentWorkspace } = useChatStore();
  const channels = useChannels(currentWorkspaceId);

  useEffect(() => {
    seedMockData();
  }, []);

  useEffect(() => {
    if (nostrLoginInitialized.current) return;

    import('nostr-login')
      .then(async ({ init }) => {
        init({
          bunkers: 'nsec.app,nsecbunker.com',
          theme: 'default',
          darkMode: document.documentElement.classList.contains('dark'),
        });
        nostrLoginInitialized.current = true;
      })
      .catch((error) => console.error('Failed to load nostr-login', error));

    const handleAuth = async (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('nostr-login auth', customEvent.detail);

      if (customEvent.detail.type === 'logout') {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    };

    document.addEventListener('nlAuth', handleAuth);

    return () => {
      document.removeEventListener('nlAuth', handleAuth);
    };
  }, [router]);


  useEffect(() => {
    if (channels && channels.length > 0 && !currentChannelId) {
      const firstChannel = channels[0];
      setCurrentChannel(firstChannel.id);

      if (typeof window !== 'undefined') {
        const url = `/app/w/${currentWorkspaceId}/c/${firstChannel.id}`;
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

  if (isValidating) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return null;
  }

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
