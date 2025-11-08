'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/stores/chat-store';
import { useMessageStore } from '@/lib/stores/message-store';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';

interface ChannelLinkProps {
  channelId: string;
  channelName: string;
  isActive: boolean;
  shortcutNumber?: number;
  onPopupStateChange?: (channelId: string, isOpen: boolean) => void;
  shouldBlur?: boolean;
}

export function ChannelLink({
  channelId,
  channelName,
  isActive,
  shortcutNumber,
  onPopupStateChange,
  shouldBlur = false,
}: ChannelLinkProps) {
  const { setCurrentChannel, currentWorkspaceId, currentChannelId, setNavigating } = useChatStore();
  const loading = useMessageStore((state) => state.loadingChannels[channelId] || false);
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prefetch the route for instant navigation
  useEffect(() => {
    const url = `/app/w/${currentWorkspaceId}/c/${channelId}`;
    router.prefetch(url);
  }, [router, currentWorkspaceId, channelId]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        onPopupStateChange?.(channelId, false);
        setTimeout(() => setIsAnimating(false), 200);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded, channelId, onPopupStateChange]);

  // Listen for backdrop close events
  useEffect(() => {
    const handleCloseEvent = (event: CustomEvent) => {
      if (event.detail.channelId === channelId && isExpanded) {
        setIsExpanded(false);
        setTimeout(() => setIsAnimating(false), 200);
      }
    };

    document.addEventListener('closeChannelPopup', handleCloseEvent as EventListener);
    return () => document.removeEventListener('closeChannelPopup', handleCloseEvent as EventListener);
  }, [channelId, isExpanded]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent clicking on the current active channel
    if (isActive) {
      console.log('⏭️ Already in channel, ignoring click:', channelId);
      return;
    }

    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    // IMMEDIATELY set navigation state to trigger loading UI across all components
    setNavigating(true);

    const messageStore = useMessageStore.getState();

    // IMMEDIATELY clear ALL loading states to prevent conflicts
    messageStore.clearAllLoadingStates();

    // Clear current channel messages if switching channels
    if (currentChannelId && currentChannelId !== channelId) {
      messageStore.clearChannelMessages(currentChannelId);
    }

    // Set loading state for the new channel ONLY
    messageStore.clearChannelMessages(channelId);
    messageStore.setChannelLoading(channelId);

    // Update store immediately - this will also clear navigation state
    setCurrentChannel(channelId);

    // Navigate using Next.js router - this should be fast
    const url = `/app/w/${currentWorkspaceId}/c/${channelId}`;
    router.push(url);

    // Reset flag immediately
    isNavigatingRef.current = false;
  }, [channelId, currentWorkspaceId, currentChannelId, setCurrentChannel, router]);

  const handleMoreClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExpanded) {
      setIsAnimating(true);
      onPopupStateChange?.(channelId, true);
      // Small delay to ensure the element is mounted before starting animation
      requestAnimationFrame(() => {
        setIsExpanded(true);
      });
    } else {
      setIsExpanded(false);
      onPopupStateChange?.(channelId, false);
      setTimeout(() => setIsAnimating(false), 200);
    }
  }, [isExpanded, channelId, onPopupStateChange]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement edit functionality
    console.log('Edit channel:', channelId);
  }, [channelId]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement delete functionality
    console.log('Delete channel:', channelId);
  }, [channelId]);

  return (
    <div
      ref={containerRef}
      className={`relative transition-all duration-200 ${shouldBlur && !isExpanded ? 'blur-sm opacity-50' : ''} ${isExpanded ? 'z-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          flex w-full items-center gap-3 rounded-lg px-3 text-sm transition-all duration-300 ease-in-out
          ${isExpanded ? 'py-4' : 'py-2'}
          ${
            isActive
              ? `${isExpanded ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-indigo-50 dark:bg-indigo-900/30'} text-indigo-700 dark:text-indigo-300 cursor-default`
              : `text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer ${isExpanded ? 'bg-gray-50 dark:bg-gray-900' : ''}`
          }
        `}
        title={isActive ? `Current channel: ${channelName}` : `Switch to ${channelName}`}
        onClick={(e) => {
          if (isExpanded) {
            // If popup is open, close it instead of navigating
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(false);
            onPopupStateChange?.(channelId, false);
            setTimeout(() => setIsAnimating(false), 200);
          } else if (!isActive) {
            // If popup is not open and channel is not active, navigate normally
            handleClick(e);
          }
          // If active and no popup, do nothing (prevent navigation to same channel)
        }}
      >
        <span className="flex-shrink-0 text-lg">#</span>
        <span className="flex-1 whitespace-nowrap text-left">{channelName}</span>

        {/* More button that appears on hover */}
        {isHovered && (
          <button
            onClick={handleMoreClick}
            className="flex-shrink-0 p-1 rounded transition-colors pointer-events-auto"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        )}

        {/* Show shortcut number when not hovering and not expanded */}
        {!isHovered && !isExpanded && shortcutNumber && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ⌘{shortcutNumber}
          </span>
        )}
      </div>

      {/* Expanded popup with edit and delete buttons */}
      {(isExpanded || isAnimating) && (
        <div
          className={`
            absolute top-full left-0 right-0 mt-1 z-[70] overflow-hidden rounded-lg p-2 pointer-events-auto
            transform transition-all duration-200 ease-out origin-top
            ${isExpanded ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-1'}
            ${
              isActive
                ? 'bg-indigo-100 dark:bg-indigo-900/50'
                : 'bg-gray-50 dark:bg-gray-900'
            }
          `}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={handleEditClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0px)';
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer transition-transform duration-200"
          >
            <Edit className="h-4 w-4" />
            Edit Channel
          </div>
          <div
            onClick={handleDeleteClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0px)';
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 dark:text-red-400 cursor-pointer transition-transform duration-200"
          >
            <Trash2 className="h-4 w-4" />
            Delete Channel
          </div>
        </div>
      )}
    </div>
  );
}
