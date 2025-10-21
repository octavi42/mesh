'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/db/schema';
import { formatDistanceToNow } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  currentUserPubkey?: string;
}

export function MessageList({ messages, currentUserPubkey }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <div className="text-center text-gray-500">
          No messages yet. Start the conversation!
        </div>
      </div>
    );
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
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
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
                    {group.messages.map((message, msgIndex) => {
                      const isLastInGroup = msgIndex === group.messages.length - 1;

                      return (
                        <div key={message.id} className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 ${
                              isOwnMessage
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md hover:shadow-md'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          </div>

                          {isLastInGroup && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover/messagegroup:opacity-100 transition-opacity duration-200 mb-1 whitespace-nowrap">
                              {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      );
                    })}
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
