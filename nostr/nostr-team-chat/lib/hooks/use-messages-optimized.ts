import { useState, useCallback, useRef, useEffect } from 'react';
import { DataManager, type Message, type LoadMessagesOptions } from '@/lib/data/data-manager';
import { useErrorHandler } from './use-error-handling';
import { NostrError, ErrorCode } from '@/lib/errors/nostr-errors';

export interface MessageState {
  messages: Message[];
  messagesById: Record<string, Message>;
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  lastLoadedTime?: number;
  oldestMessageTime?: number;
  newestMessageTime?: number;
}

export interface UseMessagesOptions {
  channelId: string;
  initialLimit?: number;
  loadMoreLimit?: number;
  enableAutoScroll?: boolean;
  enableLiveUpdates?: boolean;
  maxMessages?: number; // Limit messages in memory
}

export interface MessageActions {
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<void>;
  sendMessage: (content: string, replyTo?: string) => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (messageId: string) => void;
  retryFailedMessage: (messageId: string) => Promise<void>;
}

/**
 * Optimized hook for message loading with pagination, caching, and live updates
 */
export function useMessagesOptimized(options: UseMessagesOptions): MessageState & MessageActions {
  const {
    channelId,
    initialLimit = 50,
    loadMoreLimit = 25,
    enableAutoScroll = true,
    enableLiveUpdates = true,
    maxMessages = 1000
  } = options;

  const [state, setState] = useState<MessageState>({
    messages: [],
    messagesById: {},
    loading: false,
    hasMore: true,
    error: null
  });

  const dataManagerRef = useRef<DataManager | null>(null);
  const liveSubscriptionCleanupRef = useRef<(() => void) | null>(null);
  const isInitialLoadRef = useRef(true);
  const pendingMessagesRef = useRef<Set<string>>(new Set()); // Track optimistic messages

  const { handleError, clearError, withErrorHandling } = useErrorHandler({
    context: { component: 'messages', channelId },
    enableAutoRetry: false
  });

  // Initialize data manager
  useEffect(() => {
    const initDataManager = async () => {
      try {
        const { useNDK } = await import('@/lib/hooks/use-ndk');
        const { ndk } = useNDK.getState();

        if (ndk) {
          dataManagerRef.current = new DataManager(ndk);
        }
      } catch (error) {
        console.error('Failed to initialize data manager:', error);
      }
    };

    initDataManager();

    return () => {
      // Cleanup live subscription
      if (liveSubscriptionCleanupRef.current) {
        liveSubscriptionCleanupRef.current();
      }
    };
  }, []);

  // Load initial messages when channel changes
  useEffect(() => {
    if (channelId && dataManagerRef.current) {
      isInitialLoadRef.current = true;
      loadInitial();
    }

    return () => {
      // Cleanup subscription when channel changes
      if (liveSubscriptionCleanupRef.current) {
        liveSubscriptionCleanupRef.current();
        liveSubscriptionCleanupRef.current = null;
      }
    };
  }, [channelId]);

  /**
   * Normalize messages into state format
   */
  const normalizeMessages = useCallback((messages: Message[], isLoadMore = false): Partial<MessageState> => {
    const messagesById = { ...state.messagesById };
    const existingMessages = isLoadMore ? state.messages : [];

    // Add new messages to lookup
    messages.forEach(message => {
      messagesById[message.id] = message;
    });

    // Merge and sort messages
    const allMessages = isLoadMore
      ? [...messages, ...existingMessages] // Prepend older messages
      : [...existingMessages, ...messages]; // Append newer messages

    // Remove duplicates and sort by timestamp
    const uniqueMessages = Array.from(
      new Map(allMessages.map(m => [m.id, m])).values()
    ).sort((a, b) => a.createdAt - b.createdAt);

    // Limit messages in memory
    const limitedMessages = uniqueMessages.slice(-maxMessages);

    // Calculate time bounds
    const timestamps = limitedMessages.map(m => m.createdAt);
    const oldestMessageTime = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
    const newestMessageTime = timestamps.length > 0 ? Math.max(...timestamps) : undefined;

    return {
      messages: limitedMessages,
      messagesById,
      oldestMessageTime,
      newestMessageTime,
      lastLoadedTime: Date.now()
    };
  }, [state.messagesById, state.messages, maxMessages]);

  /**
   * Load initial messages for the channel
   */
  const loadInitial = useCallback(
    withErrorHandling(async () => {
      if (!dataManagerRef.current || !channelId) return;

      console.log('📥 Loading initial messages for channel:', channelId);

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        messages: [],
        messagesById: {},
        hasMore: true
      }));

      clearError();

      try {
        const messages = await dataManagerRef.current.loadMessages(channelId, {
          limit: initialLimit
        });

        const normalized = normalizeMessages(messages);

        setState(prev => ({
          ...prev,
          ...normalized,
          loading: false,
          hasMore: messages.length === initialLimit
        }));

        // Set up live subscription for new messages
        if (enableLiveUpdates) {
          setupLiveSubscription();
        }

        isInitialLoadRef.current = false;
        console.log(`✅ Loaded ${messages.length} initial messages`);

      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load messages'
        }));
        throw error;
      }
    }, { operation: 'loadInitial' }),
    [channelId, initialLimit, enableLiveUpdates, normalizeMessages, clearError, withErrorHandling]
  );

  /**
   * Load more (older) messages
   */
  const loadMore = useCallback(
    withErrorHandling(async () => {
      if (!dataManagerRef.current || !channelId || state.loading || !state.hasMore) {
        return;
      }

      console.log('📥 Loading more messages for channel:', channelId);

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const beforeTime = state.oldestMessageTime || Date.now();
        const messages = await dataManagerRef.current.loadOlderMessages(
          channelId,
          beforeTime,
          loadMoreLimit
        );

        const normalized = normalizeMessages(messages, true);

        setState(prev => ({
          ...prev,
          ...normalized,
          loading: false,
          hasMore: messages.length === loadMoreLimit
        }));

        console.log(`✅ Loaded ${messages.length} more messages`);

      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load more messages'
        }));
        throw error;
      }
    }, { operation: 'loadMore' }),
    [channelId, loadMoreLimit, state.loading, state.hasMore, state.oldestMessageTime, normalizeMessages, withErrorHandling]
  );

  /**
   * Send a new message
   */
  const sendMessage = useCallback(
    withErrorHandling(async (content: string, replyTo?: string) => {
      if (!dataManagerRef.current || !channelId || !content.trim()) {
        return;
      }

      // Validate message length
      if (content.length > 280) {
        throw new NostrError(
          'Message is too long',
          ErrorCode.MESSAGE_TOO_LONG,
          { component: 'messages', channelId }
        );
      }

      console.log('📤 Sending message to channel:', channelId);

      try {
        const messageId = await dataManagerRef.current.sendMessage(channelId, content.trim(), replyTo);

        // Mark as pending
        pendingMessagesRef.current.add(messageId);

        console.log('✅ Message sent successfully:', messageId);

        // Message will be added via live subscription or optimistic update
        // Remove from pending after a delay
        setTimeout(() => {
          pendingMessagesRef.current.delete(messageId);
        }, 5000);

      } catch (error) {
        console.error('❌ Failed to send message:', error);
        throw error;
      }
    }, { operation: 'sendMessage' }),
    [channelId, withErrorHandling]
  );

  /**
   * Refresh messages (force reload)
   */
  const refresh = useCallback(
    withErrorHandling(async () => {
      if (!dataManagerRef.current || !channelId) return;

      console.log('🔄 Refreshing messages for channel:', channelId);

      // Clear cache
      dataManagerRef.current.clearChannelCache(channelId);

      // Reload initial messages
      await loadInitial();
    }, { operation: 'refresh' }),
    [channelId, loadInitial, withErrorHandling]
  );

  /**
   * Set up live subscription for new messages
   */
  const setupLiveSubscription = useCallback(() => {
    if (!dataManagerRef.current || !enableLiveUpdates) return;

    // Cleanup existing subscription
    if (liveSubscriptionCleanupRef.current) {
      liveSubscriptionCleanupRef.current();
    }

    console.log('📡 Setting up live subscription for channel:', channelId);

    try {
      const cleanup = dataManagerRef.current.subscribeToChannel(
        channelId,
        (message: Message) => {
          console.log('🔴 Received live message:', message.id);

          // Remove from pending if it was our message
          pendingMessagesRef.current.delete(message.id);

          // Add to state if it's newer than our newest message
          setState(prev => {
            const isNewer = !prev.newestMessageTime ||
                           message.createdAt > prev.newestMessageTime;

            if (isNewer && !prev.messagesById[message.id]) {
              const normalized = normalizeMessages([message]);

              return {
                ...prev,
                ...normalized
              };
            }

            return prev;
          });
        },
        () => {
          console.log('✅ Live subscription ready for channel:', channelId);
        }
      );

      liveSubscriptionCleanupRef.current = cleanup;

    } catch (error) {
      console.error('❌ Failed to set up live subscription:', error);
      handleError(error, { operation: 'liveSubscription' });
    }
  }, [channelId, enableLiveUpdates, normalizeMessages, handleError]);

  /**
   * Mark message as read (placeholder for read receipts)
   */
  const markAsRead = useCallback((messageId: string) => {
    // TODO: Implement read receipts
    console.log('👁️ Marked message as read:', messageId);
  }, []);

  /**
   * Retry sending a failed message
   */
  const retryFailedMessage = useCallback(
    withErrorHandling(async (messageId: string) => {
      const message = state.messagesById[messageId];
      if (!message) return;

      console.log('🔄 Retrying failed message:', messageId);

      // Remove failed message from state
      setState(prev => {
        const updatedMessages = prev.messages.filter(m => m.id !== messageId);
        const updatedById = { ...prev.messagesById };
        delete updatedById[messageId];

        return {
          ...prev,
          messages: updatedMessages,
          messagesById: updatedById
        };
      });

      // Resend
      await sendMessage(message.content, message.replyTo);
    }, { operation: 'retryMessage' }),
    [state.messagesById, sendMessage, withErrorHandling]
  );

  return {
    // State
    messages: state.messages,
    messagesById: state.messagesById,
    loading: state.loading,
    hasMore: state.hasMore,
    error: state.error,
    lastLoadedTime: state.lastLoadedTime,
    oldestMessageTime: state.oldestMessageTime,
    newestMessageTime: state.newestMessageTime,

    // Actions
    loadInitial,
    loadMore,
    sendMessage,
    refresh,
    markAsRead,
    retryFailedMessage
  };
}

/**
 * Hook for optimized message list with virtual scrolling support
 */
export function useVirtualizedMessages(channelId: string, containerHeight: number = 400) {
  const messageHook = useMessagesOptimized({
    channelId,
    enableAutoScroll: false // Handled by virtualization
  });

  const [viewportStart, setViewportStart] = useState(0);
  const [viewportEnd, setViewportEnd] = useState(50);

  const MESSAGE_HEIGHT = 60; // Estimated message height in pixels
  const BUFFER_SIZE = 10; // Extra messages to render outside viewport

  // Calculate visible message range
  const updateViewport = useCallback((scrollTop: number) => {
    const start = Math.max(0, Math.floor(scrollTop / MESSAGE_HEIGHT) - BUFFER_SIZE);
    const end = Math.min(
      messageHook.messages.length,
      Math.ceil((scrollTop + containerHeight) / MESSAGE_HEIGHT) + BUFFER_SIZE
    );

    setViewportStart(start);
    setViewportEnd(end);

    // Load more messages if near the top
    if (start < 5 && messageHook.hasMore && !messageHook.loading) {
      messageHook.loadMore();
    }
  }, [containerHeight, messageHook]);

  const visibleMessages = messageHook.messages.slice(viewportStart, viewportEnd);
  const totalHeight = messageHook.messages.length * MESSAGE_HEIGHT;
  const offsetY = viewportStart * MESSAGE_HEIGHT;

  return {
    ...messageHook,
    visibleMessages,
    totalHeight,
    offsetY,
    updateViewport,
    messageHeight: MESSAGE_HEIGHT
  };
}