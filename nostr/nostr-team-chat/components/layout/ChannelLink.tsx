'use client';

import { useRef } from 'react';
import { useChatStore } from '@/lib/stores/chat-store';

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
  const { setCurrentChannel, currentWorkspaceId } = useChatStore();
  const isNavigatingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      setCurrentChannel(channelId);

      if (typeof window !== 'undefined') {
        const url = `/w/${currentWorkspaceId}/c/${channelId}`;
        window.history.pushState({}, '', url);
      }

      requestAnimationFrame(() => {
        isNavigatingRef.current = false;
      });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <button
      onMouseDown={handleMouseDown}
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
      {shortcutNumber && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ⌘{shortcutNumber}
        </span>
      )}
    </button>
  );
}
