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

  constructor(private relayUrl: string) {}

  async connect(): Promise<void> {
    if (this.relay?.connected) {
      console.log('✅ Already connected to relay');
      return;
    }

    try {
      console.log(`🔌 Connecting to relay: ${this.relayUrl}`);
      this.relay = await Relay.connect(this.relayUrl);

      console.log(`✅ Connected to NIP-29 relay: ${this.relayUrl}`);
      this.reconnectAttempts = 0;

    } catch (error) {
      console.error('❌ Failed to connect to relay:', error);
      this.handleReconnect();
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
        content: event.content.substring(0, 100)
      });

      const result = await this.relay.publish(event);
      console.log('✅ Event published successfully:', {
        kind: event.kind,
        id: event.id,
        result
      });
    } catch (error) {
      console.error('❌ Failed to publish event:', {
        kind: event.kind,
        id: event.id,
        error: error.message,
        tags: event.tags
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
      let sub: any;

      const timeout = setTimeout(() => {
        if (sub) {
          this.fetchSubscriptions.delete(sub);
          sub.close();
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
          sub.close();
          resolve(events);
        },
        onclose: (reason) => {
          clearTimeout(timeout);
          this.fetchSubscriptions.delete(sub);
          if (reason && reason !== 'closed by caller') {
            console.log('🔌 Fetch subscription closed unexpectedly:', reason);
            reject(new Error(`Subscription closed: ${reason}`));
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
