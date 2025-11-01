'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/lib/db/schema';
import { formatDistanceToNow } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  currentUserPubkey?: string;
}

export function MessageList({ messages, currentUserPubkey }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

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
                    {group.messages.map((message, msgIndex) => {
                      const isLastInGroup = msgIndex === group.messages.length - 1;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 group/message relative`}
                          onMouseLeave={() => {
                            if (activeMessageId === message.id) {
                              setActiveMessageId(null);
                            }
                          }}
                        >
                          <div
                            className={`rounded-2xl px-4 py-2.5 shadow-sm relative ${isOwnMessage ? 'transition-all duration-300 ease-out' : ''} ${isOwnMessage ? (activeMessageId === message.id ? '-translate-x-20' : 'group-hover/message:-translate-x-12') : ''} ${
                              isOwnMessage
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md hover:shadow-md'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          </div>

                          {/* Animated hover component - slides from right and fades in - only for own messages */}
                          {isOwnMessage && (
                            <div className={`absolute top-1/2 -translate-y-1/2 -right-2 transition-all duration-300 ease-out ${
                              activeMessageId === message.id
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 translate-x-16 group-hover/message:opacity-100 group-hover/message:translate-x-0'
                            }`}>
                              {/* Edit and Delete buttons - base layer */}
                              <div className={`flex items-center gap-1 transition-opacity duration-300 ${
                                activeMessageId === message.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                              }`}>
                                <button
                                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  onClick={() => {
                                    // TODO: Implement edit functionality
                                    console.log('Edit message:', message.id);
                                    setActiveMessageId(null);
                                  }}
                                >
                                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  onClick={() => {
                                    // TODO: Implement delete functionality
                                    console.log('Delete message:', message.id);
                                    setActiveMessageId(null);
                                  }}
                                >
                                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>

                              {/* Three dots button - positioned absolutely to center over edit/delete buttons */}
                              <div
                                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded-full shadow-lg flex items-center justify-center w-8 h-8 cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-600 transition-opacity duration-300 ${
                                  activeMessageId === message.id ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                }`}
                                onClick={() => setActiveMessageId(message.id)}
                              >
                                <span>•••</span>
                              </div>
                            </div>
                          )}

                          {isLastInGroup && (
                            <span className={`text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover/messagegroup:opacity-100 transition-all duration-300 ease-out ${isOwnMessage ? (activeMessageId === message.id ? '-translate-x-20' : 'group-hover/message:-translate-x-12') : ''} mb-1 whitespace-nowrap`}>
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
