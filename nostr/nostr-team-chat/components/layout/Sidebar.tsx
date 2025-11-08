'use client';

import { useEffect, useState, useCallback } from 'react';
import { useChannels } from '@/lib/hooks/use-channels';
import { useChatStore } from '@/lib/stores/chat-store';
import { ChannelLink } from './ChannelLink';
import { WorkspaceList } from './WorkspaceList';
import { CreateChannelSheet } from '@/components/sheets/create-channel-sheet';
import { ChannelInfoSheet } from '@/components/sheets/channel-info-sheet';
import { Plus, Info } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const { currentChannelId, setCurrentChannel, currentWorkspaceId } = useChatStore();
  const channels = useChannels(currentWorkspaceId);
  const [expandedChannelId, setExpandedChannelId] = useState<string | null>(null);

  const handlePopupStateChange = useCallback((channelId: string, isOpen: boolean) => {
    setExpandedChannelId(isOpen ? channelId : null);
  }, []);

  const handleBackdropClick = useCallback(() => {
    if (expandedChannelId) {
      setExpandedChannelId(null);
      // Trigger a custom event to notify the expanded channel to close
      const event = new CustomEvent('closeChannelPopup', { detail: { channelId: expandedChannelId } });
      document.dispatchEvent(event);
    }
  }, [expandedChannelId]);

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
        flex h-full border-r border-gray-100 bg-white dark:border-gray-900 dark:bg-black
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-[336px]' : 'w-0'}
      `}
      style={{
        overflow: 'hidden',
      }}
    >
      <div className="flex w-20 flex-shrink-0 flex-col border-r border-gray-100 dark:border-gray-900">
        <div className="flex-1 overflow-y-auto">
          <WorkspaceList />
        </div>
      </div>

      <div className="flex w-64 flex-shrink-0 flex-col">
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-900">
          <h2 className="whitespace-nowrap text-base font-medium text-gray-900 dark:text-white">
            Channels
          </h2>
          <ChannelInfoSheet
            trigger={
              <button className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-50 transition-colors dark:hover:bg-gray-900">
                <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 relative">
          {/* Backdrop overlay when popup is open */}
          {expandedChannelId && (
            <div
              className="absolute inset-0 z-40 bg-transparent pointer-events-auto"
              onClick={handleBackdropClick}
              style={{ pointerEvents: 'auto' }}
            />
          )}

          <div className="space-y-1 relative z-50">
            {/* Create new chat button */}
            <CreateChannelSheet
              workspaceId={currentWorkspaceId}
              trigger={
                <button className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700">
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Create new chat</span>
                </button>
              }
            />

            {channels?.map((channel, index) => (
              <ChannelLink
                key={channel.id}
                channelId={channel.id}
                channelName={channel.name}
                isActive={currentChannelId === channel.id}
                shortcutNumber={index < 9 ? index + 1 : undefined}
                onPopupStateChange={handlePopupStateChange}
                shouldBlur={expandedChannelId !== null && expandedChannelId !== channel.id}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
