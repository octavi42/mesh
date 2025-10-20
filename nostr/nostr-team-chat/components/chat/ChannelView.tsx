'use client';

import { useEffect } from 'react';
import { useChannel } from '@/lib/hooks/use-channels';
import { UserAvatars } from '@/components/ui/user-avatars';
import { AccountSheet } from '@/components/sheets/account-sheet';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessageStore } from '@/lib/stores/message-store';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';

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
  console.log('🎨 ChannelView rendering for channelId:', channelId);
  const channel = useChannel(channelId);
  const { currentWorkspaceId } = useChatStore();
  const { pubkey } = useAuthStore();
  const { sendMessage, loadMessages, subscribeToChannel, unsubscribeFromChannel } = useMessageStore();

  const messagesMap = useMessageStore((state) => state.messages);
  const messages = messagesMap.get(channelId) || [];

  useEffect(() => {
    if (!currentWorkspaceId || !channelId) return;

    const initChannel = async () => {
      await loadMessages(channelId, currentWorkspaceId);
      await subscribeToChannel(channelId, currentWorkspaceId);
    };

    initChannel();

    return () => {
      unsubscribeFromChannel(channelId);
    };
  }, [channelId, currentWorkspaceId]);

  const handleSendMessage = async (content: string) => {
    if (!currentWorkspaceId) return;
    await sendMessage(currentWorkspaceId, channelId, content);
  };

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Channel not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-black">
      {/* Header with channel name and user avatars */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6 dark:border-gray-900 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg text-gray-400">#</span>
          <h1 className="text-base font-medium text-gray-900 dark:text-white">
            {channel.name}
          </h1>
          {channel.description && (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {channel.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <UserAvatars users={mockUsers} size={40} maxVisible={5} />
          <button
            style={{
              background: 'green',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              marginLeft: '12px',
              zIndex: 9999,
              position: 'relative'
            }}
            onClick={() => console.log('TEST BUTTON CLICKED')}
          >
            TEST
          </button>
          <div className="ml-3 relative z-50">
            <AccountSheet />
          </div>
        </div>
      </div>

      <MessageList messages={messages} currentUserPubkey={pubkey || undefined} />

      <MessageInput
        channelName={channel.name}
        onSend={handleSendMessage}
        disabled={!currentWorkspaceId || !pubkey}
      />
    </div>
  );
}
