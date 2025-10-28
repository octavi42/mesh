import { Relay } from 'nostr-tools/relay';
import type { Filter } from 'nostr-tools/filter';
import type {
  NostrEvent,
  EventHandler,
  EOSEHandler,
} from './types';

type SubscriptionFilter = Filter;

export class NIP29RelayClient {
  private relay: Relay | null = null;
  private subscriptions: Map<string, { close: () => void }> = new Map();
  private fetchSubscriptions: Set<{ close: () => void }> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private maxSubscriptions = 15; // Leave room for temporary fetch subscriptions
  private isAuthenticated = false;
  private authChallenge: string | null = null;

  constructor(private relayUrl: string) {}

  async connect(): Promise<void> {
    if (this.relay?.connected) {
      console.log('✅ Already connected to relay');
      await this.ensureAuthenticated();
      return;
    }

    try {
      console.log(`🔌 Connecting to relay: ${this.relayUrl}`);
      this.relay = await Relay.connect(this.relayUrl);

      // Set up authentication handlers
      this.setupAuthHandlers();

      console.log(`✅ Connected to NIP-29 relay: ${this.relayUrl}`);
      this.reconnectAttempts = 0;

      // Try to authenticate immediately after connection
      await this.attemptProactiveAuth();

    } catch (error) {
      console.error('❌ Failed to connect to relay:', error);
      this.handleReconnect();
      throw error;
    }
  }

  private setupAuthHandlers(): void {
    if (!this.relay) {
      console.warn('⚠️ Cannot setup auth handlers: relay not available');
      return;
    }

    console.log('🔧 Setting up authentication handlers for relay:', this.relayUrl);

    // Set up the auth callback handler
    (this.relay as any)._onauth = (challenge: string) => {
      console.log('🔐 Received AUTH challenge from relay:', {
        challenge,
        relayUrl: this.relayUrl,
        currentAuthStatus: this.isAuthenticated
      });

      this.authChallenge = challenge;
      this.authenticateWithRelay().catch(error => {
        console.error('❌ Failed to authenticate with relay in callback:', error);
      });
    };

    console.log('✅ Auth handlers set up successfully');
  }

  private async waitForNostr(maxAttempts: number = 10): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.nostr) {
        console.log('✅ Nostr extension found after', i, 'attempts');
        return true;
      }
      console.log('⏳ Waiting for Nostr extension... attempt', i + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  private async authenticateWithRelay(): Promise<void> {
    if (!this.relay || !this.authChallenge) {
      console.warn('⚠️ Cannot authenticate: missing relay or challenge', {
        relay: !!this.relay,
        challenge: !!this.authChallenge
      });
      return;
    }

    // Wait for Nostr extension to be available
    const nostrAvailable = await this.waitForNostr();
    if (!nostrAvailable) {
      console.error('❌ Cannot authenticate: Nostr extension not available after waiting');
      return;
    }

    try {
      console.log('🔐 Authenticating with relay...', {
        relayUrl: this.relayUrl,
        challenge: this.authChallenge,
        currentAuthStatus: this.isAuthenticated
      });

      // Use the relay's built-in auth method
      const signAuthEvent = async (eventTemplate: any) => {
        console.log('🔐 Signing auth event template:', {
          kind: eventTemplate.kind,
          tags: eventTemplate.tags,
          content: eventTemplate.content?.substring(0, 50)
        });

        const signedEvent = await window.nostr!.signEvent(eventTemplate);
        console.log('✅ Event signed successfully:', {
          id: signedEvent.id,
          pubkey: signedEvent.pubkey,
          kind: signedEvent.kind
        });

        return signedEvent;
      };

      console.log('📤 Calling relay.auth method...');
      console.log('🔍 Relay auth method available:', typeof (this.relay as any).auth);

      if (typeof (this.relay as any).auth !== 'function') {
        console.error('❌ Relay does not have auth method!');
        throw new Error('Relay does not support authentication');
      }

      const result = await (this.relay as any).auth(signAuthEvent);
      console.log('✅ Authentication successful:', result);
      this.isAuthenticated = true;

    } catch (error: any) {
      console.error('❌ Failed to authenticate with relay:', {
        error: error?.message || error,
        stack: error?.stack,
        relayUrl: this.relayUrl
      });
      this.isAuthenticated = false;
      throw error;
    }
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  async disconnect(): Promise<void> {
    if (!this.relay) return;

    console.log(`🔌 Disconnecting and closing ${this.subscriptions.size} subscriptions + ${this.fetchSubscriptions.size} fetch subscriptions`);

    this.subscriptions.forEach((sub, subId) => {
      console.log(`🔌 Closing subscription on disconnect: ${subId}`);
      sub.close();
    });
    this.subscriptions.clear();

    this.fetchSubscriptions.forEach(sub => {
      sub.close();
    });
    this.fetchSubscriptions.clear();

    this.relay.close();
    this.relay = null;

    console.log('✅ Disconnected from relay');
  }

  async publishEvent(event: NostrEvent): Promise<void> {
    // Ensure we're connected before publishing
    if (!this.isConnected()) {
      console.log('🔌 Relay not connected, attempting to connect...');
      await this.connect();
    }

    if (!this.relay || !this.relay.connected) {
      throw new Error('Not connected to relay');
    }

    try {
      console.log('📤 Publishing event:', {
        kind: event.kind,
        id: event.id,
        tags: event.tags,
        content: event.content.substring(0, 100),
        relayUrl: this.relayUrl,
        relayConnected: this.relay.connected
      });

      // Add a timeout wrapper to prevent hanging
      const publishPromise = this.relay.publish(event);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Custom publish timeout after 10 seconds')), 10000);
      });

      const result = await Promise.race([publishPromise, timeoutPromise]);
      console.log('✅ Event published successfully:', {
        kind: event.kind,
        id: event.id,
        result
      });
    } catch (error: any) {
      console.error('❌ Failed to publish event:', {
        kind: event.kind,
        id: event.id,
        error: error?.message || error,
        stack: error?.stack,
        tags: event.tags,
        relayUrl: this.relayUrl,
        relayConnected: this.relay?.connected
      });
      throw error;
    }
  }

  subscribe(
    filters: SubscriptionFilter | SubscriptionFilter[],
    onEvent: EventHandler,
    onEOSE?: EOSEHandler
  ): string {
    if (!this.relay || !this.relay.connected) {
      throw new Error('Not connected to relay');
    }

    // Check subscription limit
    if (this.subscriptions.size >= this.maxSubscriptions) {
      console.warn(`⚠️ Subscription limit reached (${this.maxSubscriptions}), cleaning up old subscriptions`);
      this.cleanupOldestSubscription();
    }

    const filtersArray = Array.isArray(filters) ? filters : [filters];
    const subId = Math.random().toString(36).substring(7);

    const sub = this.relay.subscribe(filtersArray, {
      onevent: onEvent,
      oneose: onEOSE,
    });

    this.subscriptions.set(subId, sub);

    console.log(`📡 Subscribed: ${subId} (${this.subscriptions.size}/${this.maxSubscriptions})`);

    return subId;
  }

  private cleanupOldestSubscription(): void {
    const oldestSubId = this.subscriptions.keys().next().value;
    if (oldestSubId) {
      console.log('🧹 Cleaning up oldest subscription:', oldestSubId);
      this.unsubscribe(oldestSubId);
    }
  }

  private cleanupFetchSubscriptions(): void {
    if (this.fetchSubscriptions.size > 3) {
      console.log(`🧹 Cleaning up ${this.fetchSubscriptions.size} fetch subscriptions`);
      this.fetchSubscriptions.forEach(sub => {
        sub.close();
      });
      this.fetchSubscriptions.clear();
    }
  }

  unsubscribe(subId: string): void {
    const sub = this.subscriptions.get(subId);
    if (sub) {
      sub.close();
      this.subscriptions.delete(subId);
      console.log(`🔌 Unsubscribed: ${subId} (${this.subscriptions.size}/${this.maxSubscriptions} remaining)`);
    }
  }

  unsubscribeAll(): void {
    console.log(`🔌 Closing ${this.subscriptions.size} subscriptions`);
    this.subscriptions.forEach((sub, subId) => {
      console.log(`🔌 Closing subscription: ${subId}`);
      sub.close();
    });
    this.subscriptions.clear();
    console.log('✅ All subscriptions closed');
  }

  isConnected(): boolean {
    return this.relay?.connected || false;
  }

  getRelayUrl(): string {
    return this.relayUrl;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  getAuthenticationStatus(): boolean {
    return this.isAuthenticated;
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated && this.authChallenge) {
      console.log('🔐 Ensuring authentication...');
      await this.authenticateWithRelay();
    }
  }

  private async attemptProactiveAuth(): Promise<void> {
    if (!this.relay) {
      console.log('⚠️ Cannot attempt proactive auth: missing relay');
      return;
    }

    // Wait for Nostr extension to be available
    const nostrAvailable = await this.waitForNostr();
    if (!nostrAvailable) {
      console.log('⚠️ Cannot attempt proactive auth: Nostr extension not available after waiting');
      return;
    }

    try {
      console.log('🔐 Attempting proactive authentication...');

      // Create a fake challenge to trigger auth
      this.authChallenge = Math.random().toString(36).substring(2, 15);

      // Use the relay's built-in auth method
      const signAuthEvent = async (eventTemplate: any) => {
        console.log('🔐 Signing proactive auth event template:', eventTemplate);
        return await window.nostr!.signEvent(eventTemplate);
      };

      const result = await (this.relay as any).auth(signAuthEvent);
      console.log('✅ Proactive authentication successful:', result);
      this.isAuthenticated = true;

    } catch (error: any) {
      console.log('⚠️ Proactive authentication failed (this is normal):', error?.message || 'Unknown error');
      // This is expected if the relay doesn't require auth for this user yet
    }
  }

  async fetchEvents(
    filters: SubscriptionFilter | SubscriptionFilter[]
  ): Promise<NostrEvent[]> {
    // Ensure we're connected before fetching
    if (!this.isConnected()) {
      console.log('🔌 Relay not connected, attempting to connect...');
      await this.connect();
    }

    // Clean up any old fetch subscriptions before creating new ones
    this.cleanupFetchSubscriptions();

    return new Promise((resolve, reject) => {
      const events: NostrEvent[] = [];
      let sub: unknown;

      const timeout = setTimeout(() => {
        if (sub && typeof sub === 'object' && sub !== null && 'close' in sub) {
          this.fetchSubscriptions.delete(sub);
          (sub as any).close();
        }
        reject(new Error('Fetch timeout'));
      }, 10000);

      const filtersArray = Array.isArray(filters) ? filters : [filters];

      if (!this.relay || !this.relay.connected) {
        clearTimeout(timeout);
        reject(new Error('Not connected to relay'));
        return;
      }

      console.log(`📡 Creating fetch subscription (${this.fetchSubscriptions.size + this.subscriptions.size}/20 total)`);

      sub = this.relay.subscribe(filtersArray, {
        onevent: (event) => {
          events.push(event);
        },
        oneose: () => {
          clearTimeout(timeout);
          this.fetchSubscriptions.delete(sub);
          if (sub && typeof sub === 'object' && sub !== null && 'close' in sub) {
            (sub as any).close();
          }
          resolve(events);
        },
        onclose: (reason: string) => {
          clearTimeout(timeout);
          this.fetchSubscriptions.delete(sub);
          if (reason && reason !== 'closed by caller') {
            console.log('🔌 Fetch subscription closed unexpectedly:', reason);

            // Handle auth-required errors
            if (reason.includes('auth-required')) {
              console.log('🔐 Authentication required for this request - trying to handle...');

              // Try to authenticate and retry the request
              // Generate a challenge if we don't have one
              if (!this.authChallenge) {
                this.authChallenge = Math.random().toString(36).substring(2, 15);
              }

              this.authenticateWithRelay()
                .then(() => {
                  // If auth succeeds, we could retry the request here
                  // For now, just reject with a clearer message
                  reject(new Error('Authentication required - please reconnect or try again'));
                })
                .catch((authError: any) => {
                  reject(new Error(`Authentication failed: ${authError?.message || 'Unknown auth error'}`));
                });
            } else {
              reject(new Error(`Subscription closed: ${reason}`));
            }
          } else {
            console.log('📥 Fetch completed, returning', events.length, 'events');
            resolve(events);
          }
        },
      });

      // Track the temporary subscription
      this.fetchSubscriptions.add(sub);
    });
  }
}

let globalClient: NIP29RelayClient | null = null;

export function getGlobalNIP29Client(relayUrl?: string): NIP29RelayClient {
  if (!globalClient) {
    const url = relayUrl || process.env.NEXT_PUBLIC_NIP29_RELAY_URL || 'wss://groups.contextio.app';
    console.log('🔧 Creating new NIP29RelayClient for:', url);
    globalClient = new NIP29RelayClient(url);
  }

  // Check if connection is stale and recreate if needed
  if (globalClient && globalClient.relay && !globalClient.relay.connected) {
    console.log('⚠️ Detected stale relay connection, will reconnect on next operation');
  }

  return globalClient;
}

export async function disconnectGlobalClient(): Promise<void> {
  if (globalClient) {
    await globalClient.disconnect();
    globalClient = null;
  }
}
