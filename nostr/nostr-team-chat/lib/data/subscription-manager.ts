import { NDK, NDKSubscription, NDKFilter } from '@nostr-dev-kit/ndk';

export interface SubscriptionOptions {
  onEvent?: (event: any) => void;
  onEose?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
  autoCleanup?: boolean;
}

/**
 * Manages NDK subscriptions with guaranteed cleanup to prevent memory leaks
 * Replaces manual subscription handling throughout the app
 */
export class SubscriptionManager {
  private subscriptions = new Map<string, NDKSubscription>();
  private cleanupFunctions = new Map<string, () => void>();
  private isDisposed = false;

  constructor(private ndk: NDK) {}

  /**
   * Create a subscription with automatic cleanup management
   */
  subscribe(
    key: string,
    filter: NDKFilter,
    options: SubscriptionOptions = {}
  ): () => void {
    if (this.isDisposed) {
      throw new Error('SubscriptionManager has been disposed');
    }

    // Always cleanup existing subscription with same key first
    this.cleanup(key);

    console.log(`📡 Creating subscription: ${key}`);

    try {
      const subscription = this.ndk.subscribe(filter, {
        closeOnEose: options.autoCleanup ?? false,
        groupable: false
      });

      // Set up event handlers
      if (options.onEvent) {
        subscription.on('event', options.onEvent);
      }

      if (options.onEose) {
        subscription.on('eose', () => {
          console.log(`✅ EOSE for subscription: ${key}`);
          options.onEose!();
        });
      }

      if (options.onError) {
        subscription.on('error', (error: Error) => {
          console.error(`❌ Error in subscription ${key}:`, error);
          options.onError!(error);
        });
      }

      // Set up timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          console.warn(`⏰ Subscription ${key} timed out after ${options.timeout}ms`);
          this.cleanup(key);
        }, options.timeout);
      }

      // Store subscription and create cleanup function
      this.subscriptions.set(key, subscription);

      const cleanupFn = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        try {
          subscription.stop();
          console.log(`🛑 Stopped subscription: ${key}`);
        } catch (error) {
          console.warn(`Warning: Failed to stop subscription ${key}:`, error);
        }
      };

      this.cleanupFunctions.set(key, cleanupFn);

      // Return cleanup function for manual cleanup
      return () => this.cleanup(key);

    } catch (error) {
      console.error(`❌ Failed to create subscription ${key}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to live updates for a specific workspace
   */
  subscribeToWorkspace(
    workspaceId: string,
    onUpdate: (event: any) => void,
    onReady?: () => void
  ): () => void {
    const key = `workspace:${workspaceId}`;

    const filter: NDKFilter = {
      kinds: [9, 11, 39000, 39001, 39002, 9021], // Messages, metadata, join requests
      "#h": [workspaceId],
      since: Math.floor(Date.now() / 1000)
    };

    return this.subscribe(key, filter, {
      onEvent: onUpdate,
      onEose: onReady,
      onError: (error) => {
        console.error(`Failed to subscribe to workspace ${workspaceId}:`, error);
      },
      timeout: 30000 // 30 second timeout
    });
  }

  /**
   * Subscribe to messages for a specific channel
   */
  subscribeToChannel(
    channelId: string,
    onMessage: (event: any) => void,
    onReady?: () => void
  ): () => void {
    const key = `channel:${channelId}`;

    // Parse channel ID to extract workspace and channel
    const parts = channelId.split('-');
    if (parts.length < 2) {
      throw new Error(`Invalid channel ID format: ${channelId}`);
    }

    const workspaceId = parts[0];
    const channelName = parts.slice(1).join('-');

    const filter: NDKFilter = {
      kinds: [9, 11], // GroupChatMessage and EncryptedDM
      "#h": [workspaceId],
      "#c": [channelName],
      since: Math.floor(Date.now() / 1000)
    };

    return this.subscribe(key, filter, {
      onEvent: onMessage,
      onEose: onReady,
      onError: (error) => {
        console.error(`Failed to subscribe to channel ${channelId}:`, error);
      },
      timeout: 30000
    });
  }

  /**
   * Subscribe to workspace metadata updates only
   */
  subscribeToWorkspaceMetadata(
    workspaceId: string,
    onMetadataUpdate: (event: any) => void
  ): () => void {
    const key = `metadata:${workspaceId}`;

    const filter: NDKFilter = {
      kinds: [39000, 39001, 39002], // Metadata, admins, members
      "#h": [workspaceId],
      since: Math.floor(Date.now() / 1000)
    };

    return this.subscribe(key, filter, {
      onEvent: onMetadataUpdate,
      onError: (error) => {
        console.error(`Failed to subscribe to workspace metadata ${workspaceId}:`, error);
      },
      autoCleanup: false
    });
  }

  /**
   * Clean up a specific subscription
   */
  cleanup(key: string): void {
    const cleanupFn = this.cleanupFunctions.get(key);
    if (cleanupFn) {
      try {
        cleanupFn();
      } catch (error) {
        console.warn(`Warning during cleanup of ${key}:`, error);
      }

      this.subscriptions.delete(key);
      this.cleanupFunctions.delete(key);
      console.log(`🧹 Cleaned up subscription: ${key}`);
    }
  }

  /**
   * Clean up subscriptions by pattern (e.g., "workspace:", "channel:")
   */
  cleanupByPattern(pattern: string): void {
    const keysToCleanup = Array.from(this.subscriptions.keys())
      .filter(key => key.startsWith(pattern));

    keysToCleanup.forEach(key => this.cleanup(key));

    if (keysToCleanup.length > 0) {
      console.log(`🧹 Cleaned up ${keysToCleanup.length} subscriptions matching pattern: ${pattern}`);
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanupAll(): void {
    console.log(`🧹 Cleaning up all ${this.subscriptions.size} subscriptions`);

    const keys = Array.from(this.subscriptions.keys());
    keys.forEach(key => this.cleanup(key));
  }

  /**
   * Get active subscription count and details
   */
  getSubscriptionStats(): {
    total: number;
    byType: Record<string, number>;
    active: string[];
  } {
    const stats = {
      total: this.subscriptions.size,
      byType: {} as Record<string, number>,
      active: Array.from(this.subscriptions.keys())
    };

    // Count by type (workspace, channel, metadata, etc.)
    for (const key of this.subscriptions.keys()) {
      const type = key.split(':')[0];
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Check if a specific subscription exists
   */
  hasSubscription(key: string): boolean {
    return this.subscriptions.has(key);
  }

  /**
   * Dispose of the subscription manager (cleanup all and prevent new subscriptions)
   */
  dispose(): void {
    if (this.isDisposed) return;

    console.log('🗑️ Disposing SubscriptionManager');
    this.cleanupAll();
    this.isDisposed = true;
  }

  /**
   * Create a scoped subscription manager for a specific component
   * Useful for React components that need multiple subscriptions
   */
  createScope(scopeName: string): ScopedSubscriptionManager {
    return new ScopedSubscriptionManager(this, scopeName);
  }
}

/**
 * Scoped subscription manager for component-level subscription management
 */
export class ScopedSubscriptionManager {
  private scopedKeys = new Set<string>();

  constructor(
    private parentManager: SubscriptionManager,
    private scopeName: string
  ) {}

  subscribe(
    key: string,
    filter: NDKFilter,
    options: SubscriptionOptions = {}
  ): () => void {
    const scopedKey = `${this.scopeName}:${key}`;
    this.scopedKeys.add(scopedKey);

    return this.parentManager.subscribe(scopedKey, filter, options);
  }

  subscribeToWorkspace(
    workspaceId: string,
    onUpdate: (event: any) => void,
    onReady?: () => void
  ): () => void {
    const key = `workspace:${workspaceId}`;
    return this.subscribe(key, {
      kinds: [9, 11, 39000, 39001, 39002, 9021],
      "#h": [workspaceId],
      since: Math.floor(Date.now() / 1000)
    }, {
      onEvent: onUpdate,
      onEose: onReady,
      timeout: 30000
    });
  }

  subscribeToChannel(
    channelId: string,
    onMessage: (event: any) => void,
    onReady?: () => void
  ): () => void {
    const parts = channelId.split('-');
    if (parts.length < 2) {
      throw new Error(`Invalid channel ID format: ${channelId}`);
    }

    const workspaceId = parts[0];
    const channelName = parts.slice(1).join('-');
    const key = `channel:${channelId}`;

    return this.subscribe(key, {
      kinds: [9, 11],
      "#h": [workspaceId],
      "#c": [channelName],
      since: Math.floor(Date.now() / 1000)
    }, {
      onEvent: onMessage,
      onEose: onReady,
      timeout: 30000
    });
  }

  cleanup(key?: string): void {
    if (key) {
      const scopedKey = `${this.scopeName}:${key}`;
      this.parentManager.cleanup(scopedKey);
      this.scopedKeys.delete(scopedKey);
    } else {
      // Cleanup all scoped subscriptions
      for (const scopedKey of this.scopedKeys) {
        this.parentManager.cleanup(scopedKey);
      }
      this.scopedKeys.clear();
    }
  }

  getStats() {
    return {
      scope: this.scopeName,
      subscriptions: this.scopedKeys.size,
      active: Array.from(this.scopedKeys)
    };
  }
}