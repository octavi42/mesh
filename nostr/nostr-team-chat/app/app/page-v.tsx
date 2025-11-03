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
  console.log('🎯 NAVIGATION: AppPage component is mounting');

  const router = useRouter();
  const { isAuthenticated, pubkey, loading, hasHydrated } = useAuthStore();
  const nip29Initialized = useRef(false);
  const { currentChannelId, setCurrentChannel, currentWorkspaceId, setCurrentWorkspace } = useChatStore();
  const { initializeClient, workspaces, currentWorkspace, isLoading: workspaceLoading, error: workspaceError } = useWorkspaceStore();
  const channels = useChannels(currentWorkspaceId);

  console.log('🎯 NAVIGATION: AppPage hooks initialized');

  // Use auth redirect effect
  useEffect(() => {
    if (hasHydrated && !loading && !isAuthenticated) {
      console.log('❌ useSecureAuth: Not authenticated, redirecting to /');
      router.push('/');
    }
  }, [isAuthenticated, hasHydrated, router, loading]);

  console.log('🔍 AppPage render START');
  console.log('🔐 Auth state:', { isAuthenticated, pubkey: pubkey?.substring(0, 8), loading });
  console.log('💧 Hydration state:', { hasHydrated });
  console.log('📂 Workspace state:', {
    workspacesCount: workspaces?.length,
    currentWorkspace: currentWorkspace?.groupId,
    workspaceLoading,
    workspaceError
  });
  console.log('💬 Chat state:', { currentWorkspaceId, currentChannelId });
  console.log('📺 Channels state:', {
    channelsCount: channels?.length,
    channelNames: channels?.map(c => c.name)
  });
  console.log('🔄 NIP29 initialized:', nip29Initialized.current);
  console.log('🔍 AppPage render END');
  console.log('---');


  useEffect(() => {
    if (nip29Initialized.current || !isAuthenticated || !hasHydrated) {
      console.log('⏭️ Skipping NIP-29 init:', {
        alreadyInitialized: nip29Initialized.current,
        isAuthenticated,
        hasHydrated
      });
      return;
    }

    console.log('🚀 Starting NIP-29 client initialization');
    nip29Initialized.current = true;

    const runInit = async () => {
      try {
        console.log('📞 Calling initializeClient...');
        await initializeClient();
        console.log('✅ initializeClient completed successfully');
      } catch (error) {
        console.error('❌ initializeClient failed:', error);
        nip29Initialized.current = false;
      }
    };

    runInit();
  }, [isAuthenticated, initializeClient, hasHydrated]);

  useEffect(() => {
    if (currentWorkspace && currentWorkspace.groupId !== currentWorkspaceId) {
      console.log('🔄 Syncing currentWorkspaceId from workspace-store:', currentWorkspace.groupId);
      setCurrentWorkspace(currentWorkspace.groupId);
    }
  }, [currentWorkspace, currentWorkspaceId, setCurrentWorkspace]);

  // Handle case when no workspaces exist yet
  useEffect(() => {
    if (isAuthenticated && !loading && workspaces.length === 0) {
      console.log('⚠️ No workspaces found after authentication');
      console.log('💡 To fix this: Create a workspace or join an existing one');
      console.log('💡 Check if workspace initialization completed successfully');
    }
  }, [isAuthenticated, loading, workspaces]);

  // Test function to create mock data for debugging
  const createTestWorkspace = async () => {
    try {
      console.log('🧪 Creating test workspace...');
      const { createWorkspace } = useWorkspaceStore.getState();
      await createWorkspace('Test Workspace', 'A test workspace for debugging');
      console.log('✅ Test workspace created');
    } catch (error) {
      console.error('❌ Failed to create test workspace:', error);
    }
  };

  // Debug function to check database state
  const checkDatabaseState = async () => {
    try {
      console.log('🔍 Checking database state...');
      const { db } = await import('@/lib/db/schema');
      const workspaces = await db.nip29Workspaces.toArray();
      const channels = await db.channels.toArray();
      console.log('📊 Database state:', {
        workspacesCount: workspaces.length,
        channelsCount: channels.length,
        workspaces: workspaces.map(w => ({ id: w.groupId, name: w.name })),
        channels: channels.map(c => ({ id: c.id, name: c.name, workspaceId: c.workspaceId }))
      });
    } catch (error) {
      console.error('❌ Failed to check database:', error);
    }
  };

  // Force refresh function to reinitialize everything
  const forceRefresh = async () => {
    try {
      console.log('🔄 Force refreshing...');
      nip29Initialized.current = false;
      const { initializeClient } = useWorkspaceStore.getState();
      await initializeClient();
      console.log('✅ Force refresh completed');
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
    }
  };


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

  if (loading || !isAuthenticated || !hasHydrated) {
    return null;
  }

  // Show loading state or welcome message
  if (!currentChannelId || workspaces.length === 0) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Welcome to Nostr Team Chat
            </h1>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {workspaces.length === 0
                ? "Create or join a workspace to get started with decentralized team collaboration"
                : "Decentralized team collaboration powered by Nostr"
              }
            </p>
            {workspaces.length === 0 && (
              <div className="mt-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {channels.length === 0 ? "Loading channels..." : `Found ${channels.length} channels but no workspace selected`}
                </div>
                <div className="space-x-2 space-y-2">
                  <button
                    onClick={createTestWorkspace}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Create Test Workspace
                  </button>
                  <button
                    onClick={checkDatabaseState}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Check Database
                  </button>
                  <button
                    onClick={forceRefresh}
                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Force Refresh
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Debug: isAuthenticated={String(isAuthenticated)}, loading={String(loading)}, hasHydrated={String(hasHydrated)}, workspaceLoading={String(workspaceLoading)}
                </div>
              </div>
            )}
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
