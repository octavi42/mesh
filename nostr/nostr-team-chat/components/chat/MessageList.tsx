'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/lib/db/schema';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUserPubkey?: string;
}

export function MessageList({ messages, currentUserPubkey }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  const TIME_GROUPING_WINDOW = 5 * 60 * 1000;

  const messageGroups: Array<{ messages: typeof messages; groupId: string }> = [];
  let currentGroup: typeof messages = [];

  messages.forEach((message, index) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;

    const isNewGroup = !prevMessage ||
      prevMessage.authorPubkey !== message.authorPubkey ||
      (message.createdAt - prevMessage.createdAt) > TIME_GROUPING_WINDOW;

    if (isNewGroup && currentGroup.length > 0) {
      messageGroups.push({ messages: [...currentGroup], groupId: `${currentGroup[0].id}-group` });
      currentGroup = [];
    }

    currentGroup.push(message);
  });

  if (currentGroup.length > 0) {
    messageGroups.push({ messages: [...currentGroup], groupId: `${currentGroup[0].id}-group` });
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden p-6" style={{ minHeight: 0 }}>
      {messageGroups.map((group) => {
        const firstMessage = group.messages[0];
        const lastMessage = group.messages[group.messages.length - 1];
        const isOwnMessage = firstMessage.authorPubkey === currentUserPubkey;
        const shortPubkey = firstMessage.authorPubkey.substring(0, 8);

        return (
          <div key={group.groupId} className="group/messagegroup mt-4">
            <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isOwnMessage && (
                  <div className="flex-shrink-0 self-end mb-0.5" style={{ width: '36px' }}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                      {shortPubkey.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                )}

                <div className={`flex flex-col gap-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {!isOwnMessage && (
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-1">
                      {shortPubkey}
                    </span>
                  )}

                  <div className="space-y-0.5">
                    {group.messages.map((message, msgIndex) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        msgIndex={msgIndex}
                        groupMessagesLength={group.messages.length}
                        isOwnMessage={isOwnMessage}
                        activeMessageId={activeMessageId}
                        hoveredMessageId={hoveredMessageId}
                        setActiveMessageId={setActiveMessageId}
                        setHoveredMessageId={setHoveredMessageId}
                        lastMessage={lastMessage}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
