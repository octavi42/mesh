'use client';

import { useChannel } from '@/lib/hooks/use-channels';
import { UserAvatars } from '@/components/ui/user-avatars';
import { AccountSheet } from '@/components/sheets/account-sheet';

interface ChannelViewProps {
  channelId: string;
}

// Mock users data - replace with real workspace members later
const mockUsers = [
  { id: 1, name: 'Alice', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', pubkey: 'npub1alice123456789' },
  { id: 2, name: 'Bob', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', pubkey: 'npub1bob123456789' },
  { id: 3, name: 'Carol', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', pubkey: 'npub1carol123456789' },
  { id: 4, name: 'David', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', pubkey: 'npub1david123456789' },
  { id: 5, name: 'Eve', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve', pubkey: 'npub1eve123456789' },
  { id: 6, name: 'Frank', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank', pubkey: 'npub1frank123456789' },
  { id: 7, name: 'Grace', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace', pubkey: 'npub1grace123456789' },
  { id: 8, name: 'Henry', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Henry', pubkey: 'npub1henry123456789' },
];

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
      {/* Header with user avatars */}
      <div className="flex h-16 items-center justify-end px-6 gap-3">
        <UserAvatars users={mockUsers} size={40} maxVisible={5} />
        <AccountSheet />
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <div className="text-center text-gray-500">
          No messages yet. Start the conversation!
        </div>
      </div>

      <div className="p-4">
        <input
          type="text"
          placeholder={`Message #${channel.name}`}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
    </div>
  );
}
