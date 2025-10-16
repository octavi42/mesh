'use client';

import { useEffect } from 'react';
import { useChannels } from '@/lib/hooks/use-channels';
import { useChatStore } from '@/lib/stores/chat-store';
import { ChannelLink } from './ChannelLink';

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const { currentChannelId, setCurrentChannel, currentWorkspaceId } = useChatStore();
  const channels = useChannels(currentWorkspaceId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (channels && channels[index]) {
          setCurrentChannel(channels[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channels, setCurrentChannel]);

  return (
    <aside
      className={`
        flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-0'}
      `}
      style={{
        overflow: 'hidden',
      }}
    >
      <div className="flex h-14 w-64 flex-shrink-0 items-center border-b border-gray-200 px-4 dark:border-gray-800">
        <h2 className="whitespace-nowrap text-lg font-semibold text-gray-900 dark:text-white">
          Team Chat
        </h2>
      </div>

      <div className="w-64 flex-1 flex-shrink-0 overflow-y-auto p-3">
        <div className="space-y-1">
          {channels?.map((channel, index) => (
            <ChannelLink
              key={channel.id}
              channelId={channel.id}
              channelName={channel.name}
              isActive={currentChannelId === channel.id}
              shortcutNumber={index < 9 ? index + 1 : undefined}
            />
          ))}
        </div>
      </div>

      <div className="w-64 flex-shrink-0 border-t border-gray-200 p-3 dark:border-gray-800">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
            U
          </div>
          <span className="flex-1 truncate whitespace-nowrap text-left">User</span>
        </button>
      </div>
    </aside>
  );
}
