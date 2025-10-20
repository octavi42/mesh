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
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

export default function AppPage() {
  const router = useRouter();
  const { isAuthenticated, pubkey, loading } = useSecureAuth(true);
  const nip29Initialized = useRef(false);
  const { currentChannelId, setCurrentChannel, currentWorkspaceId, setCurrentWorkspace } = useChatStore();
  const { initializeClient, workspaces, currentWorkspace } = useWorkspaceStore();
  const channels = useChannels(currentWorkspaceId);

  console.log('🔍 AppPage render:', { isAuthenticated, pubkey });
  console.log('📂 Workspaces:', workspaces);
  console.log('📍 Current workspace (workspace-store):', currentWorkspace?.groupId);
  console.log('📍 Current workspace (chat-store):', currentWorkspaceId);
  console.log('📺 Channels:', channels);
  console.log('📍 Current channel:', currentChannelId);

  useEffect(() => {
    seedMockData();
  }, []);

  useEffect(() => {
    if (nip29Initialized.current || !isAuthenticated) return;

    nip29Initialized.current = true;
    initializeClient().catch((error) => {
      console.error('Failed to initialize NIP-29:', error);
      nip29Initialized.current = false;
    });
  }, [isAuthenticated, initializeClient]);

  useEffect(() => {
    if (currentWorkspace && currentWorkspace.groupId !== currentWorkspaceId) {
      console.log('🔄 Syncing currentWorkspaceId from workspace-store:', currentWorkspace.groupId);
      setCurrentWorkspace(currentWorkspace.groupId);
    }
  }, [currentWorkspace, currentWorkspaceId, setCurrentWorkspace]);

  useEffect(() => {
    import('@/lib/nostr-login-init')
      .then(({ initNostrLogin }) => initNostrLogin())
      .catch((error) => console.error('Failed to load nostr-login', error));

    const handleAuth = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const authType = customEvent.detail.type;

      console.log('📡 /APP PAGE nlAuth event:', authType, customEvent.detail);

      if (authType === 'logout') {
        console.log('🚪 /APP PAGE: Logout event - clearing data');
        const { clearAllData } = useWorkspaceStore.getState();
        const { reset: resetChat } = useChatStore.getState();

        await clearAllData();
        resetChat();
        router.push('/');
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

  if (loading || !isAuthenticated) {
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
