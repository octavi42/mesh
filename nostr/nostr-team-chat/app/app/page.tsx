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
  const { isValidating, isValid, isAuthenticated, pubkey } = useSecureAuth(true);
  const nostrLoginInitialized = useRef(false);
  const { currentChannelId, setCurrentChannel, currentWorkspaceId, setCurrentWorkspace } = useChatStore();
  const channels = useChannels(currentWorkspaceId);

  console.log('🔍 AppPage render:', { isValidating, isValid, isAuthenticated, pubkey });

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
      const authType = customEvent.detail.type;

      console.log('📡 /app nlAuth event:', authType, customEvent.detail);

      if (authType === 'logout') {
        console.log('🔴 Logout event received in /app');

        const { logout } = useAuthStore.getState();

        await fetch('/api/auth/logout', { method: 'POST' }).catch(err =>
          console.error('Failed to call logout API:', err)
        );

        logout();

        setTimeout(() => {
          console.log('Redirecting to / after logout');
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
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isValid) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
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
