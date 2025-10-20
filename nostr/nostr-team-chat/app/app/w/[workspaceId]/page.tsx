'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useChatStore } from '@/lib/stores/chat-store';
import { useChannels } from '@/lib/hooks/use-channels';
import { useSecureAuth } from '@/lib/hooks/use-secure-auth';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const { isAuthenticated, loading } = useSecureAuth({ redirectOnUnauth: true });
  const { setCurrentWorkspace } = useChatStore();
  const channels = useChannels(workspaceId);

  useEffect(() => {
    if (workspaceId) {
      setCurrentWorkspace(workspaceId);
    }
  }, [workspaceId, setCurrentWorkspace]);

  useEffect(() => {
    if (channels && channels.length > 0) {
      const firstChannel = channels[0];
      router.replace(`/app/w/${workspaceId}/c/${firstChannel.id}`);
    }
  }, [channels, workspaceId, router]);

  if (loading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Welcome to your workspace
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Select a channel or create a new one to get started
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
