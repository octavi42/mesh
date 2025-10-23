'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/stores/chat-store';
import { useMessageStore } from '@/lib/stores/message-store';

interface ChannelLinkProps {
  channelId: string;
  channelName: string;
  isActive: boolean;
  shortcutNumber?: number;
}

export function ChannelLink({
  channelId,
  channelName,
  isActive,
  shortcutNumber,
}: ChannelLinkProps) {
  const { setCurrentChannel, currentWorkspaceId, currentChannelId, setNavigating } = useChatStore();
  const loading = useMessageStore((state) => state.loadingChannels[channelId] || false);
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  // Prefetch the route for instant navigation
  useEffect(() => {
    const url = `/app/w/${currentWorkspaceId}/c/${channelId}`;
    router.prefetch(url);
  }, [router, currentWorkspaceId, channelId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    // IMMEDIATELY set navigation state to trigger loading UI across all components
    setNavigating(true);

    const messageStore = useMessageStore.getState();

    // IMMEDIATELY clear the current channel's messages (if any) for instant visual feedback
    if (currentChannelId && currentChannelId !== channelId) {
      messageStore.clearChannelMessages(currentChannelId);
    }

    // Set loading state for the new channel
    messageStore.clearChannelMessages(channelId);
    messageStore.setChannelLoading(channelId);

    // Update store immediately - this will also clear navigation state
    setCurrentChannel(channelId);

    // Navigate using Next.js router - this should be fast
    const url = `/app/w/${currentWorkspaceId}/c/${channelId}`;
    router.push(url);

    // Reset flag immediately
    isNavigatingRef.current = false;
  }, [channelId, currentWorkspaceId, currentChannelId, setCurrentChannel, router]);

  return (
    <button
      onClick={handleClick}
      className={`
        flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
        ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }
      `}
    >
      <span className="flex-shrink-0 text-lg">#</span>
      <span className="flex-1 whitespace-nowrap text-left">{channelName}</span>
      {shortcutNumber ? (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ⌘{shortcutNumber}
        </span>
      ) : null}
    </button>
  );
}
