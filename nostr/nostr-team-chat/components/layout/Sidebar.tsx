'use client';

import { useEffect } from 'react';
import { useChannels } from '@/lib/hooks/use-channels';
import { useChatStore } from '@/lib/stores/chat-store';
import { ChannelLink } from './ChannelLink';
import { WorkspaceList } from './WorkspaceList';
import { CreateChannelSheet } from '@/components/sheets/create-channel-sheet';
import { Plus } from 'lucide-react';

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
        flex h-full border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-[336px]' : 'w-0'}
      `}
      style={{
        overflow: 'hidden',
      }}
    >
      <div className="flex w-20 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800">
        <div className="flex-1 overflow-y-auto">
          <WorkspaceList />
        </div>
      </div>

      <div className="flex w-64 flex-shrink-0 flex-col">
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <h2 className="whitespace-nowrap text-lg font-semibold text-gray-900 dark:text-white">
            Channels
          </h2>
          <CreateChannelSheet
            trigger={
              <button className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
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
      </div>
    </aside>
  );
}
