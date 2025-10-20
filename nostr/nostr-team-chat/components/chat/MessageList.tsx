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

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.authorPubkey === currentUserPubkey;
        const shortPubkey = message.authorPubkey.substring(0, 8);
        const timeAgo = formatDistanceToNow(message.createdAt, { addSuffix: true });

        return (
          <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                  {shortPubkey.substring(0, 2).toUpperCase()}
                </div>
              </div>

              <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {shortPubkey}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {timeAgo}
                  </span>
                </div>

                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
