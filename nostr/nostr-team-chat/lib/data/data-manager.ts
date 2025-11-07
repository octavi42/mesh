import { NDK, NDKKind, NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
import { WorkspaceDataManager, type Workspace } from './workspace-data-manager';
import { SubscriptionManager } from './subscription-manager';

export interface Message {
  id: string;
  channelId: string;
  workspaceId: string;
  content: string;
  authorPubkey: string;
  createdAt: number;
  replyTo?: string;
  kind: number;
  tags: string[][];
}

export interface MessageFilter {
  channelId?: string;
  workspaceId?: string;
  since?: number;
  until?: number;
  limit?: number;
  authors?: string[];
}

export interface LoadMessagesOptions {
  limit?: number;
  until?: number;
  loadOlder?: boolean;
}

interface MessageCache {
  messages: Message[];
  timestamp: number;
  hasMore: boolean;
  oldestMessageTime?: number;
  newestMessageTime?: number;
}

/**
 * Unified data manager that handles all Nostr data operations
 * Implements the two-phase approach: metadata first, content on-demand
 */
export class DataManager {
  private workspaceManager: WorkspaceDataManager;
  private subscriptionManager: SubscriptionManager;
  private messageCache = new Map<string, MessageCache>();
  private readonly MESSAGE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  constructor(private ndk: NDK) {
    this.workspaceManager = new WorkspaceDataManager(ndk);
    this.subscriptionManager = new SubscriptionManager(ndk);

    console.log('🚀 DataManager initialized');
  }

  // ========== Workspace Operations ==========

  /**
   * Phase 1: Load workspace metadata for a user
   */
  async loadWorkspaceMetadata(
    pubkey: string,
    options: { forceRefresh?: boolean; timeout?: number } = {}
  ): Promise<Workspace[]> {
    console.log('📂 Loading workspace metadata for user:', pubkey.slice(0, 8));
    return this.workspaceManager.fetchWorkspaceMetadata(pubkey, options);
  }

  /**
   * Get cached workspaces for a user
   */
  getCachedWorkspaces(pubkey: string): Workspace[] {
    return this.workspaceManager.getCachedWorkspaces(pubkey);
  }

  /**
   * Check if workspaces should be refreshed
   */
  shouldRefreshWorkspaces(pubkey: string): boolean {
    return this.workspaceManager.shouldRefetchWorkspaces(pubkey);
  }

  // ========== Message Operations ==========

  /**
   * Phase 2: Load messages for a specific channel
   */
  async loadMessages(
    channelId: string,
    options: LoadMessagesOptions = {}
  ): Promise<Message[]> {
    const { limit = 50, until, loadOlder = false } = options;

    console.log('💬 Loading messages for channel:', channelId, { limit, until, loadOlder });

    // Parse channel ID
    const { workspaceId, channelName } = this.parseChannelId(channelId);

    try {
      // Check cache first
      if (!loadOlder && !until) {
        const cached = this.getCachedMessages(channelId);
        if (cached.length > 0) {
          console.log('📦 Using cached messages for channel:', channelId);
          return cached;
        }
      }

      // Wait for relay connection
      await this.waitForConnection();

      // Create filter for messages
      const filter: NDKFilter = {
        kinds: [9, 11] as NDKKind[], // GroupChatMessage and EncryptedDM
        "#h": [workspaceId],
        limit,
      };

      // Add channel filter if it's not the general channel
      if (channelName !== 'general') {
        filter["#c"] = [channelName];
      }

      // Add time filtering
      if (until) {
        filter.until = Math.floor(until / 1000);
      } else if (!loadOlder) {
        // For initial load, get recent messages
        filter.since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000); // Last 24 hours
      }

      console.log('📜 Fetching messages with filter:', filter);

      const events = await this.ndk.fetchEvents(filter);
      const messages = this.processMessageEvents(Array.from(events), channelId, workspaceId);

      // Sort messages by timestamp
      messages.sort((a, b) => a.createdAt - b.createdAt);

      // Update cache
      this.updateMessageCache(channelId, messages, loadOlder);

      console.log(`✅ Loaded ${messages.length} messages for channel:`, channelId);
      return messages;

    } catch (error) {
      console.error('❌ Failed to load messages:', error);

      // Return cached messages if available
      const cached = this.getCachedMessages(channelId);
      if (cached.length > 0) {
        console.log('📦 Falling back to cached messages');
        return cached;
      }

      throw error;
    }
  }

  /**
   * Load older messages for pagination
   */
  async loadOlderMessages(channelId: string, beforeTime: number, limit = 50): Promise<Message[]> {
    return this.loadMessages(channelId, {
      limit,
      until: beforeTime,
      loadOlder: true
    });
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    channelId: string,
    content: string,
    replyTo?: string
  ): Promise<string> {
    const { workspaceId, channelName } = this.parseChannelId(channelId);

    console.log('📤 Sending message to channel:', channelId);

    try {
      // Create message event
      const messageEvent = new NDKEvent(this.ndk);
      messageEvent.kind = 9; // GroupChatMessage
      messageEvent.content = content;
      messageEvent.tags = [
        ['h', workspaceId], // Group ID
      ];

      // Add channel tag if not general
      if (channelName !== 'general') {
        messageEvent.tags.push(['c', channelName]);
      }

      // Add reply tag if replying
      if (replyTo) {
        messageEvent.tags.push(['e', replyTo]);
      }

      // Sign and publish
      await messageEvent.sign();
      await messageEvent.publish();

      console.log('✅ Message sent successfully:', messageEvent.id);

      // Optimistically add to cache
      const optimisticMessage: Message = {
        id: messageEvent.id!,
        channelId,
        workspaceId,
        content,
        authorPubkey: messageEvent.pubkey,
        createdAt: messageEvent.created_at! * 1000,
        replyTo,
        kind: 9,
        tags: messageEvent.tags
      };

      this.addOptimisticMessage(channelId, optimisticMessage);

      return messageEvent.id!;

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  // ========== Subscription Management ==========

  /**
   * Subscribe to live updates for a workspace
   */
  subscribeToWorkspace(
    workspaceId: string,
    onUpdate: (event: NDKEvent) => void,
    onReady?: () => void
  ): () => void {
    console.log('📡 Subscribing to workspace updates:', workspaceId);

    return this.subscriptionManager.subscribeToWorkspace(
      workspaceId,
      onUpdate,
      onReady
    );
  }

  /**
   * Subscribe to live messages for a channel
   */
  subscribeToChannel(
    channelId: string,
    onMessage: (message: Message) => void,
    onReady?: () => void
  ): () => void {
    console.log('📡 Subscribing to channel messages:', channelId);

    return this.subscriptionManager.subscribeToChannel(
      channelId,
      (event: NDKEvent) => {
        try {
          const { workspaceId } = this.parseChannelId(channelId);
          const messages = this.processMessageEvents([event], channelId, workspaceId);

          if (messages.length > 0) {
            const message = messages[0];
            this.addOptimisticMessage(channelId, message);
            onMessage(message);
          }
        } catch (error) {
          console.error('❌ Failed to process live message:', error);
        }
      },
      onReady
    );
  }

  /**
   * Subscribe to workspace metadata changes only
   */
  subscribeToWorkspaceMetadata(
    workspaceId: string,
    onMetadataUpdate: (event: NDKEvent) => void
  ): () => void {
    console.log('📡 Subscribing to workspace metadata:', workspaceId);

    return this.subscriptionManager.subscribeToWorkspaceMetadata(
      workspaceId,
      onMetadataUpdate
    );
  }

  // ========== Cache Management ==========

  /**
   * Get cached messages for a channel
   */
  getCachedMessages(channelId: string): Message[] {
    const cache = this.messageCache.get(channelId);
    if (!cache) return [];

    // Check if cache is still valid
    if (Date.now() - cache.timestamp > this.MESSAGE_CACHE_DURATION) {
      this.messageCache.delete(channelId);
      return [];
    }

    return cache.messages;
  }

  /**
   * Update message cache
   */
  private updateMessageCache(
    channelId: string,
    messages: Message[],
    isOlderMessages = false
  ): void {
    const existing = this.messageCache.get(channelId);

    if (isOlderMessages && existing) {
      // Prepend older messages
      const allMessages = [...messages, ...existing.messages];
      const uniqueMessages = this.deduplicateMessages(allMessages);

      this.messageCache.set(channelId, {
        messages: uniqueMessages,
        timestamp: Date.now(),
        hasMore: messages.length === 50, // Assume more if we got a full batch
        oldestMessageTime: Math.min(
          existing.oldestMessageTime || Infinity,
          ...messages.map(m => m.createdAt)
        ),
        newestMessageTime: existing.newestMessageTime
      });
    } else {
      // New or replacement messages
      const oldestTime = messages.length > 0 ? Math.min(...messages.map(m => m.createdAt)) : undefined;
      const newestTime = messages.length > 0 ? Math.max(...messages.map(m => m.createdAt)) : undefined;

      this.messageCache.set(channelId, {
        messages: this.deduplicateMessages(messages),
        timestamp: Date.now(),
        hasMore: messages.length === 50,
        oldestMessageTime: oldestTime,
        newestMessageTime: newestTime
      });
    }

    console.log(`📦 Updated message cache for ${channelId}:`, {
      total: this.messageCache.get(channelId)!.messages.length,
      isOlder: isOlderMessages
    });
  }

  /**
   * Add optimistic message to cache (for sent messages)
   */
  private addOptimisticMessage(channelId: string, message: Message): void {
    const existing = this.messageCache.get(channelId);

    if (existing) {
      const updatedMessages = [...existing.messages, message];
      const uniqueMessages = this.deduplicateMessages(updatedMessages);

      this.messageCache.set(channelId, {
        ...existing,
        messages: uniqueMessages,
        timestamp: Date.now(),
        newestMessageTime: Math.max(
          existing.newestMessageTime || 0,
          message.createdAt
        )
      });
    } else {
      this.messageCache.set(channelId, {
        messages: [message],
        timestamp: Date.now(),
        hasMore: false,
        oldestMessageTime: message.createdAt,
        newestMessageTime: message.createdAt
      });
    }
  }

  /**
   * Clear cache for specific channel
   */
  clearChannelCache(channelId: string): void {
    this.messageCache.delete(channelId);
    console.log('🧹 Cleared cache for channel:', channelId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(pubkey?: string): void {
    this.messageCache.clear();

    if (pubkey) {
      this.workspaceManager.clearUserCache(pubkey);
    } else {
      this.workspaceManager.clearAllCache();
    }

    console.log('🧹 Cleared all caches');
  }

  // ========== Cleanup ==========

  /**
   * Dispose of the data manager
   */
  dispose(): void {
    console.log('🗑️ Disposing DataManager');

    this.subscriptionManager.dispose();
    this.messageCache.clear();
    this.workspaceManager.clearAllCache();
  }

  // ========== Private Utilities ==========

  /**
   * Parse channel ID to extract workspace and channel info
   */
  private parseChannelId(channelId: string): { workspaceId: string; channelName: string } {
    const parts = channelId.split('-');
    if (parts.length < 2) {
      throw new Error(`Invalid channel ID format: ${channelId}`);
    }

    return {
      workspaceId: parts[0],
      channelName: parts.slice(1).join('-')
    };
  }

  /**
   * Process message events into Message objects
   */
  private processMessageEvents(
    events: NDKEvent[],
    channelId: string,
    workspaceId: string
  ): Message[] {
    const messages: Message[] = [];

    for (const event of events) {
      try {
        // Verify this message belongs to the workspace
        const messageWorkspaceId = event.tags.find(tag => tag[0] === 'h')?.[1];
        if (messageWorkspaceId !== workspaceId) {
          continue;
        }

        // Parse channel from tags (default to general if not specified)
        const messageChannelName = event.tags.find(tag => tag[0] === 'c')?.[1] || 'general';
        const expectedChannelName = this.parseChannelId(channelId).channelName;

        // Only include messages for the specific channel
        if (messageChannelName !== expectedChannelName) {
          continue;
        }

        const message: Message = {
          id: event.id!,
          channelId,
          workspaceId,
          content: event.content || '',
          authorPubkey: event.pubkey,
          createdAt: event.created_at! * 1000,
          replyTo: event.tags.find(tag => tag[0] === 'e')?.[1],
          kind: event.kind!,
          tags: event.tags
        };

        messages.push(message);

      } catch (error) {
        console.warn('Failed to process message event:', event.id, error);
      }
    }

    return messages;
  }

  /**
   * Remove duplicate messages by ID
   */
  private deduplicateMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    return messages.filter(message => {
      if (seen.has(message.id)) {
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }

  /**
   * Wait for NDK connection
   */
  private async waitForConnection(timeout = 10000): Promise<void> {
    return Promise.race([
      new Promise<void>((resolve) => {
        const checkConnection = () => {
          const connectedRelays = Array.from(this.ndk.pool.relays.values())
            .filter(r => r.status === 2 || r.status === 5 || r.status === 6);

          if (connectedRelays.length > 0) {
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      )
    ]);
  }

  // ========== Statistics ==========

  /**
   * Get cache and subscription statistics
   */
  getStats(): {
    workspaceCache: any;
    messageCache: {
      channels: number;
      totalMessages: number;
      averageAge: number;
    };
    subscriptions: any;
  } {
    const messageStats = {
      channels: this.messageCache.size,
      totalMessages: 0,
      averageAge: 0
    };

    let totalAge = 0;
    for (const cache of this.messageCache.values()) {
      messageStats.totalMessages += cache.messages.length;
      totalAge += Date.now() - cache.timestamp;
    }

    if (this.messageCache.size > 0) {
      messageStats.averageAge = totalAge / this.messageCache.size;
    }

    return {
      workspaceCache: this.workspaceManager.getCacheStats(),
      messageCache: messageStats,
      subscriptions: this.subscriptionManager.getSubscriptionStats()
    };
  }
}