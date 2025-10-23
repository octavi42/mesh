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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private relayUrl: string) {}

  async connect(): Promise<void> {
    if (this.relay?.connected) {
      console.log('Already connected to relay');
      return;
    }

    try {
      this.relay = await Relay.connect(this.relayUrl);

      console.log(`✅ Connected to NIP-29 relay: ${this.relayUrl}`);
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Failed to connect to relay:', error);
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

    this.subscriptions.forEach((sub) => sub.close());
    this.subscriptions.clear();

    this.relay.close();
    this.relay = null;

    console.log('Disconnected from relay');
  }

  async publishEvent(event: NostrEvent): Promise<void> {
    if (!this.relay) {
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
    if (!this.relay) {
      throw new Error('Not connected to relay');
    }

    const filtersArray = Array.isArray(filters) ? filters : [filters];
    const subId = Math.random().toString(36).substring(7);

    const sub = this.relay.subscribe(filtersArray, {
      onevent: onEvent,
      oneose: onEOSE,
    });

    this.subscriptions.set(subId, sub);

    console.log('📡 Subscribed:', subId, filtersArray);

    return subId;
  }

  unsubscribe(subId: string): void {
    const sub = this.subscriptions.get(subId);
    if (sub) {
      sub.close();
      this.subscriptions.delete(subId);
      console.log('🔌 Unsubscribed:', subId);
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((sub) => sub.close());
    this.subscriptions.clear();
    console.log('🔌 All subscriptions closed');
  }

  isConnected(): boolean {
    return this.relay?.connected || false;
  }

  getRelayUrl(): string {
    return this.relayUrl;
  }

  async fetchEvents(
    filters: SubscriptionFilter | SubscriptionFilter[]
  ): Promise<NostrEvent[]> {
    return new Promise((resolve, reject) => {
      const events: NostrEvent[] = [];
      const timeout = setTimeout(() => {
        sub.close();
        reject(new Error('Fetch timeout'));
      }, 10000);

      const filtersArray = Array.isArray(filters) ? filters : [filters];

      if (!this.relay) {
        clearTimeout(timeout);
        reject(new Error('Not connected to relay'));
        return;
      }

      const sub = this.relay.subscribe(filtersArray, {
        onevent: (event) => {
          events.push(event);
        },
        oneose: () => {
          clearTimeout(timeout);
          sub.close();
          resolve(events);
        },
      });
    });
  }
}

let globalClient: NIP29RelayClient | null = null;

export function getGlobalNIP29Client(relayUrl?: string): NIP29RelayClient {
  if (!globalClient) {
    const url = relayUrl || process.env.NEXT_PUBLIC_NIP29_RELAY_URL || 'wss://groups.contextio.app';
    globalClient = new NIP29RelayClient(url);
  }
  return globalClient;
}

export async function disconnectGlobalClient(): Promise<void> {
  if (globalClient) {
    await globalClient.disconnect();
    globalClient = null;
  }
}
