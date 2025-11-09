'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/stores/chat-store';
import { useMessageStore } from '@/lib/stores/message-store';
import { useChannelStore } from '@/lib/stores/channel-store';
import { useNDK } from '@/lib/hooks/use-ndk';
import { showConfirmation } from '@/components/ui/global-confirmation-dialog';
import { db } from '@/lib/db/schema';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const { removeChannel } = useChannelStore();
  const { ndk } = useNDK();
  const loading = useMessageStore((state) => state.loadingChannels[channelId] || false);
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        event.preventDefault();
        event.stopPropagation();
        setIsExpanded(false);
        onPopupStateChange?.(channelId, false);
        setTimeout(() => setIsAnimating(false), 200);
      }
    };

    if (isExpanded) {
      document.addEventListener('click', handleClickOutside, true);
      return () => document.removeEventListener('click', handleClickOutside, true);
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

  const handleDeleteClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Close the popup first
    setIsExpanded(false);
    onPopupStateChange?.(channelId, false);
    setTimeout(() => setIsAnimating(false), 200);

    // Show confirmation dialog
    showConfirmation(
      'Delete Channel',
      `Are you sure you want to delete the channel #${channelName}? This action cannot be undone and all messages will be permanently deleted.`,
      'Delete Channel',
      'danger',
      async () => {
        setIsDeleting(true);
        try {
          console.log('🗑️ Starting channel deletion process for:', channelId);
          toast.loading(`Deleting channel #${channelName}...`, { id: `delete-${channelId}` });

          // If deleting the current channel, navigate away first
          if (isActive && currentWorkspaceId) {
            // Try to navigate to the first available channel or workspace
            const firstChannel = document.querySelector('[data-channel-link]:not([data-channel-id="' + channelId + '"])') as HTMLElement;
            if (firstChannel) {
              firstChannel.click();
            } else {
              router.push(`/app/w/${currentWorkspaceId}`);
            }
            // Give navigation time to complete
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // STEP 1: Delete all messages in the channel from the RELAY first
          await deleteChannelFromRelay(channelId, currentWorkspaceId, ndk);

          // STEP 2: Clean up local database (this should happen automatically via deletion events)
          // But we also do it here for immediate UI feedback
          await db.channels.delete(channelId);
          await db.messages.where('channelId').equals(channelId).delete();

          // STEP 3: Remove from store
          removeChannel(channelId);

          console.log('✅ Channel deleted successfully:', channelId);
          toast.success(`Channel #${channelName} deleted successfully`, { id: `delete-${channelId}` });
        } catch (error) {
          console.error('❌ Failed to delete channel:', error);
          toast.error(`Failed to delete channel #${channelName}: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: `delete-${channelId}` });
        } finally {
          setIsDeleting(false);
        }
      }
    );
  }, [channelId, channelName, isActive, currentWorkspaceId, router, removeChannel, onPopupStateChange, ndk]);

  // Function to delete all messages in a channel from the relay
  const deleteChannelFromRelay = async (channelId: string, workspaceId: string | null, ndkInstance: any) => {
    if (!workspaceId) {
      throw new Error('No workspace ID available for channel deletion');
    }

    if (!ndkInstance) {
      throw new Error('NDK not available for channel deletion');
    }

    try {
      console.log('🗑️ Starting channel deletion from relay:', channelId);

      // Parse channel ID to get workspace and channel name
      const parts = channelId.split('-');
      if (parts.length < 2) {
        throw new Error('Invalid channel ID format');
      }

      const groupId = parts[0];
      const channelName = parts.slice(1).join('-');

      console.log('🗑️ Parsed for deletion:', { groupId, channelName, workspaceId });

      // Get all messages in this channel from local database
      const messagesToDelete = await db.messages.where('channelId').equals(channelId).toArray();

      console.log(`🗑️ Found ${messagesToDelete.length} messages in local DB for channel ${channelName}:`,
        messagesToDelete.map(m => ({ id: m.id.slice(0, 8), content: m.content.slice(0, 30) })));

      if (messagesToDelete.length === 0) {
        console.log('ℹ️ No messages to delete in channel - fetching from relay to be sure:', channelId);

        // Try to fetch messages from relay directly to get actual event IDs
        try {
          const messages = await ndkInstance.fetchEvents({
            kinds: [9], // GroupChatMessage
            "#h": [groupId], // Filter by group ID
            "#c": [channelName], // Filter by channel name
            limit: 500
          });

          console.log(`🗑️ Found ${messages.size} messages on relay for channel ${channelName}`);

          if (messages.size === 0) {
            console.log('ℹ️ No messages found on relay either - channel is already empty');
            return;
          }

          // Use relay message IDs instead
          messagesToDelete.length = 0;
          messages.forEach(event => {
            messagesToDelete.push({
              id: event.id,
              channelId: channelId,
              authorPubkey: event.pubkey,
              content: event.content || '',
              createdAt: (event.created_at || 0) * 1000,
              updatedAt: Date.now()
            });
          });

          console.log(`🗑️ Updated message list from relay:`,
            messagesToDelete.map(m => ({ id: m.id.slice(0, 8), content: m.content.slice(0, 30) })));

        } catch (fetchError) {
          console.error('❌ Failed to fetch messages from relay:', fetchError);
          throw new Error('Could not find messages to delete');
        }
      }

      const { NDKEvent } = await import('@nostr-dev-kit/ndk');

      // Create a deletion event (kind 9005) that deletes all messages in this channel
      const deletionEvent = new NDKEvent(ndkInstance);
      deletionEvent.kind = 9005; // NIP-29 message deletion
      deletionEvent.content = `Bulk deletion of channel #${channelName}`;

      // Add group tag
      deletionEvent.tags = [
        ['h', groupId] // Group ID tag
      ];

      // Add all message IDs as 'e' tags for deletion
      messagesToDelete.forEach(message => {
        if (message.id) {
          deletionEvent.tags.push(['e', message.id]);
        }
      });

      console.log('🗑️ Creating deletion event with', deletionEvent.tags.length - 1, 'message IDs:', {
        groupId,
        channelName,
        messageIds: deletionEvent.tags.filter(tag => tag[0] === 'e').map(tag => tag[1].slice(0, 8))
      });

      // Sign and publish the deletion event
      await deletionEvent.sign();
      await deletionEvent.publish();

      console.log('✅ Channel deletion event published successfully with ID:', deletionEvent.id?.slice(0, 8));

    } catch (error) {
      console.error('❌ Failed to delete channel from relay:', error);
      throw error;
    }
  };

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
            onClick={isDeleting ? undefined : handleDeleteClick}
            onMouseEnter={isDeleting ? undefined : (e) => {
              e.currentTarget.style.transform = 'translateX(8px)';
            }}
            onMouseLeave={isDeleting ? undefined : (e) => {
              e.currentTarget.style.transform = 'translateX(0px)';
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-transform duration-200 ${
              isDeleting
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'text-red-600 dark:text-red-400 cursor-pointer'
            }`}
          >
            <Trash2 className={`h-4 w-4 ${isDeleting ? 'animate-pulse' : ''}`} />
            {isDeleting ? 'Deleting...' : 'Delete Channel'}
          </div>
        </div>
      )}
    </div>
  );
}
