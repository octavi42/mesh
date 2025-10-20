'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelView } from '@/components/chat/ChannelView';
import { useChatStore } from '@/lib/stores/chat-store';
import { useSecureAuth } from '@/lib/hooks/use-secure-auth';

export default function WorkspaceChannelPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const channelId = params.channelId as string;
  const { isAuthenticated, loading } = useSecureAuth({ redirectOnUnauth: true });
  const { setCurrentWorkspace, setCurrentChannel } = useChatStore();

  useEffect(() => {
    if (workspaceId && channelId) {
      setCurrentWorkspace(workspaceId);
      setCurrentChannel(channelId);
    }
  }, [workspaceId, channelId, setCurrentWorkspace, setCurrentChannel]);

  if (loading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <ChannelView key={channelId} channelId={channelId} />
    </AppLayout>
  );
}
