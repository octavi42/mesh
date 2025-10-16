'use client';

import { useChannel } from '@/lib/hooks/use-channels';

interface ChannelViewProps {
  channelId: string;
}

export function ChannelView({ channelId }: ChannelViewProps) {
  const channel = useChannel(channelId);

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Channel not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          # {channel.name}
        </h1>
        {channel.description && (
          <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
            {channel.description}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-gray-500">
          No messages yet. Start the conversation!
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <input
          type="text"
          placeholder={`Message #${channel.name}`}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
    </div>
  );
}
