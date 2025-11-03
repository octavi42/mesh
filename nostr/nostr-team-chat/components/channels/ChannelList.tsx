'use client';

import Link from 'next/link';
import type { Channel } from '@/lib/stores/channel-store';

interface ChannelListProps {
  channels: Channel[];
  workspaceId: string;
}

export function ChannelList({ channels, workspaceId }: ChannelListProps) {
  return (
    <div className="p-4 space-y-2">
      {channels.map((channel) => (
        <Link
          key={channel.id}
          href={`/app/w/${workspaceId}/c/${channel.id}`}
          className="block p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {channel.isPrivate ? (
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {channel.name}
                </h3>
                {channel.isPrivate && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    Private
                  </span>
                )}
              </div>
              {channel.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {channel.description}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}