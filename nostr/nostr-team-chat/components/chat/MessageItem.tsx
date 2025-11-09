'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/lib/db/schema';

interface MessageItemProps {
  message: Message;
  msgIndex: number;
  groupMessagesLength: number;
  isOwnMessage: boolean;
  activeMessageId: string | null;
  hoveredMessageId: string | null;
  setActiveMessageId: (id: string | null) => void;
  setHoveredMessageId: (id: string | null) => void;
  lastMessage: Message;
}

export function MessageItem({
  message,
  msgIndex,
  groupMessagesLength,
  isOwnMessage,
  activeMessageId,
  hoveredMessageId,
  setActiveMessageId,
  setHoveredMessageId,
}: MessageItemProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const [hoverWidth, setHoverWidth] = useState('100%');

  useEffect(() => {
    // Use character count as a simpler proxy for message width
    const messageLength = message.content.length;

    // Define thresholds for message length
    const shortMessageThreshold = 20; // Very short messages (like "Hi", "OK", etc.)
    const longMessageThreshold = 100; // Long messages that likely wrap

    const maxHoverWidth = 100;
    const minHoverWidth = 25;

    let widthRatio;
    if (messageLength <= shortMessageThreshold) {
      // Very short messages - use small width ratio (results in large hover area)
      widthRatio = messageLength / shortMessageThreshold * 0.3; // 0-30% ratio
    } else if (messageLength >= longMessageThreshold) {
      // Long messages - use high width ratio (results in small hover area)
      widthRatio = 0.9; // 90% ratio
    } else {
      // Medium messages - scale between 30% and 90%
      const mediumRange = longMessageThreshold - shortMessageThreshold;
      const position = (messageLength - shortMessageThreshold) / mediumRange;
      widthRatio = 0.3 + (position * 0.6); // Scale from 30% to 90%
    }

    // Inverse proportional calculation
    const inverseRatio = 1 - widthRatio;
    const finalWidth = minHoverWidth + (maxHoverWidth - minHoverWidth) * inverseRatio;

    setHoverWidth(`${Math.max(minHoverWidth, Math.min(maxHoverWidth, finalWidth))}%`);
  }, [message.content]);

  const isLastInGroup = msgIndex === groupMessagesLength - 1;

  return (
    <div
      key={message.id}
      className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 relative`}
      onMouseLeave={() => {
        if (activeMessageId === message.id) {
          setActiveMessageId(null);
        }
      }}
    >
      <div className="relative">
        <div
          ref={messageRef}
          className={`rounded-2xl px-4 py-2.5 shadow-sm relative ${isOwnMessage ? 'transition-all duration-300 ease-out' : ''} ${isOwnMessage ? (activeMessageId === message.id ? '-translate-x-20' : hoveredMessageId === message.id ? '-translate-x-12' : '') : ''} ${
            isOwnMessage
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words flex-1">{message.content}</p>
          </div>
        </div>

        {/* Proportional Hover Area - for all messages */}
        <div
            className={`absolute inset-y-0 group/message ${isOwnMessage ? 'right-0' : 'left-0'}`}
            style={{
              width: hoverWidth,
              zIndex: 2
            }}
            onMouseEnter={() => {
              setHoveredMessageId(message.id);
            }}
            onMouseLeave={() => {
              setHoveredMessageId(null);
            }}
          >
          </div>

        {/* Animated hover component - slides from right and fades in - only for own messages */}
        {isOwnMessage && (
        <div className={`absolute top-1/2 -translate-y-1/2 -right-2 transition-all duration-300 ease-out ${
          activeMessageId === message.id
            ? 'opacity-100 translate-x-0'
            : hoveredMessageId === message.id
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 translate-x-16'
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
      </div>

      {isLastInGroup && (
        <span className={`text-[11px] text-gray-400 dark:text-gray-500 opacity-0 group-hover/messagegroup:opacity-100 transition-all duration-300 ease-out ${isOwnMessage ? (activeMessageId === message.id ? '-translate-x-20' : hoveredMessageId === message.id ? '-translate-x-12' : '') : ''} mb-1 whitespace-nowrap`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}