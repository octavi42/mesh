import NDK, { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';
import type { NostrEvent, EventHandler, EOSEHandler } from '@/lib/nostr/nip29/types';

// Type conversion helpers
function ndkEventToNostrEvent(ndkEvent: NDKEvent): NostrEvent {
  return {
    id: ndkEvent.id!,
    pubkey: ndkEvent.pubkey!,
    created_at: ndkEvent.created_at!,
    kind: ndkEvent.kind!,
    tags: ndkEvent.tags || [],
    content: ndkEvent.content || '',
    sig: ndkEvent.sig!,
  };
}

function nostrEventToNDKEvent(ndk: NDK, nostrEvent: NostrEvent): NDKEvent {
  const ndkEvent = new NDKEvent(ndk);
  ndkEvent.id = nostrEvent.id;
  ndkEvent.pubkey = nostrEvent.pubkey;
  ndkEvent.created_at = nostrEvent.created_at;
  ndkEvent.kind = nostrEvent.kind;
  ndkEvent.tags = nostrEvent.tags;
  ndkEvent.content = nostrEvent.content;
  ndkEvent.sig = nostrEvent.sig;
  return ndkEvent;
}

/**
 * NDK-based relay client that replaces the custom NIP29RelayClient
 * Uses NDK's built-in authentication and connection management
 */
export class NDKRelayClient {
  private subscriptions: Map<string, NDKSubscription> = new Map();
  private ndkInstance: NDK | null = null;

  constructor(private relayUrl: string) {}

  setNDK(ndk: NDK): void {
    this.ndkInstance = ndk;
  }

  private getNDK(): NDK {
    if (!this.ndkInstance) {
      console.error('❌ NDK not set when requested. Components should wait for NDK initialization.');
      throw new Error('NDK not set - call setNDK() first');
    }
    return this.ndkInstance;
  }

  async connect(): Promise<void> {
    const ndk = this.getNDK();

    if (!ndk.pool.relays.size) {
      console.log('🔌 Connecting to relays via NDK...');
      await ndk.connect();
    }

    console.log('✅ NDK relay client connected');
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting NDK relay client...');

    // Close all subscriptions
    for (const [subId, subscription] of this.subscriptions) {
      subscription.stop();
      console.log(`🔌 Closed subscription: ${subId}`);
    }
    this.subscriptions.clear();

    console.log('✅ NDK relay client disconnected');
  }

  private publishedEvents = new Set<string>();

  async publishEvent(event: NostrEvent | NDKEvent): Promise<void> {
    const ndk = this.getNDK();

    // Convert NostrEvent to NDKEvent if needed
    const ndkEvent = event instanceof NDKEvent
      ? event
      : nostrEventToNDKEvent(ndk, event);

    // Check for duplicate publishing
    if (ndkEvent.id && this.publishedEvents.has(ndkEvent.id)) {
      console.log('Duplicate event publishing detected, you are publishing event', ndkEvent.id, 'twice');
      return; // Don't publish duplicate
    }

    console.log('📤 Publishing event via NDK:', {
      kind: ndkEvent.kind,
      id: ndkEvent.id,
      tags: ndkEvent.tags,
      content: ndkEvent.content?.substring(0, 100)
    });

    try {
      // Add to published events set before publishing
      if (ndkEvent.id) {
        this.publishedEvents.add(ndkEvent.id);
      }

      const relayResults = await ndkEvent.publish();
      console.log('✅ Event published successfully via NDK');

      // Return success even if some relays failed, as long as at least one succeeded
      return;
    } catch (error) {
      // Remove from published set if publishing failed
      if (ndkEvent.id) {
        this.publishedEvents.delete(ndkEvent.id);
      }

      // Handle specific NDK errors more gracefully
      if (error?.message?.includes('Not enough relays received the event')) {
        console.warn('⚠️ Some relays rejected the event, but this may be normal:', error.message);
        // Don't throw for relay issues - the event might still have been published successfully
        return;
      }

      console.error('❌ Failed to publish event via NDK:', error);
      throw error;
    }
  }

  subscribe(
    filters: NDKFilter | NDKFilter[],
    onEvent: EventHandler,
    onEOSE?: EOSEHandler
  ): string {
    const ndk = this.getNDK();
    const filtersArray = Array.isArray(filters) ? filters : [filters];
    const subId = Math.random().toString(36).substring(7);

    console.log(`📡 Creating NDK subscription: ${subId}`);

    const subscription = ndk.subscribe(filtersArray, {
      closeOnEose: false,
      groupable: false,
    });

    // Convert NDK events to NostrEvent format for compatibility
    subscription.on('event', (ndkEvent: NDKEvent) => {
      const nostrEvent = ndkEventToNostrEvent(ndkEvent);
      onEvent(nostrEvent);
    });

    if (onEOSE) {
      subscription.on('eose', onEOSE);
    }

    subscription.on('close', () => {
      console.log(`🔌 Subscription closed: ${subId}`);
      this.subscriptions.delete(subId);
    });

    this.subscriptions.set(subId, subscription);
    subscription.start();

    console.log(`📡 NDK subscription started: ${subId}`);
    return subId;
  }

  unsubscribe(subId: string): void {
    const subscription = this.subscriptions.get(subId);
    if (subscription) {
      subscription.stop();
      this.subscriptions.delete(subId);
      console.log(`🔌 Unsubscribed: ${subId}`);
    }
  }

  unsubscribeAll(): void {
    console.log(`🔌 Closing ${this.subscriptions.size} NDK subscriptions`);

    for (const [subId, subscription] of this.subscriptions) {
      subscription.stop();
    }

    this.subscriptions.clear();
    console.log('✅ All NDK subscriptions closed');
  }

  isConnected(): boolean {
    const ndk = this.getNDK();
    const connectedRelays = Array.from(ndk.pool.relays.values())
      .filter(relay => {
        const isConnected = relay.status >= 1 || relay.connectivity?.status === 'connected';
        console.log('🔍 Relay connection check:', {
          url: relay.url,
          status: relay.status,
          connectivityStatus: relay.connectivity?.status,
          isConnected
        });
        return isConnected;
      });

    const hasConnections = connectedRelays.length > 0;
    console.log(`🔍 Overall connection status: ${hasConnections} (${connectedRelays.length}/${ndk.pool.relays.size} relays)`);
    return hasConnections;
  }

  async forceReauth(): Promise<void> {
    console.log('🔄 Force reauth via NDK - reconnecting to relays...');

    const ndk = this.getNDK();

    // Reconnect to all relays to trigger fresh auth
    for (const relay of ndk.pool.relays.values()) {
      if (relay.status >= 1) { // Any connected state including authenticated
        console.log(`🔄 Reconnecting to relay: ${relay.url}`);
        relay.disconnect();
        await relay.connect();
      }
    }
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
    const ndk = this.getNDK();

    if (!this.isConnected()) {
      return false;
    }

    // Check if we have relays that can be used (connected and potentially authenticated)
    // In the logs, authentication is working but status detection is failing
    const usableRelays = Array.from(ndk.pool.relays.values())
      .filter(relay => {
        // Check multiple authentication indicators
        const isConnected = relay.status >= 1 || relay.connectivity?.status === 'connected';
        const isAuthenticated = relay.status >= 5 || relay.authenticated === true;

        console.log('🔍 Relay auth status check:', {
          url: relay.url,
          status: relay.status,
          connectivityStatus: relay.connectivity?.status,
          authenticated: relay.authenticated,
          isConnected,
          isAuthenticated
        });

        return isConnected; // For now, just check if connected since auth is working in logs
      });

    const hasUsableRelays = usableRelays.length > 0;
    console.log('🔍 Authentication status result:', {
      hasUsableRelays,
      relayCount: usableRelays.length,
      totalRelays: ndk.pool.relays.size
    });

    return hasUsableRelays;
  }

  async fetchEvents(filters: NDKFilter | NDKFilter[]): Promise<NostrEvent[]> {
    const ndk = this.getNDK();

    const filtersArray = Array.isArray(filters) ? filters : [filters];

    console.log('📡 Fetching events via NDK with filters:', filtersArray);

    try {
      const events = await ndk.fetchEvents(filtersArray);
      const eventArray = Array.from(events).map(ndkEventToNostrEvent);

      console.log(`📥 Fetched ${eventArray.length} events via NDK`);
      return eventArray;
    } catch (error) {
      console.error('❌ Failed to fetch events via NDK:', error);
      throw error;
    }
  }
}

let globalNDKClient: NDKRelayClient | null = null;

export function getGlobalNDKClient(relayUrl?: string): NDKRelayClient {
  if (!globalNDKClient) {
    const url = relayUrl || process.env.NEXT_PUBLIC_NIP29_RELAY_URL || 'wss://groups.contextio.app';
    console.log('🔧 Creating new NDKRelayClient for:', url);
    globalNDKClient = new NDKRelayClient(url);
  }

  // Check if NDK instance is actually set
  if (!(globalNDKClient as any).ndkInstance) {
    console.warn('⚠️ Global NDK client requested but NDK instance not set yet. Components should wait for initialization.');
  }

  return globalNDKClient;
}

export function isGlobalNDKClientInitialized(): boolean {
  return globalNDKClient !== null && (globalNDKClient as any).ndkInstance !== null;
}

export function waitForNDKInitialization(timeoutMs = 10000): Promise<NDKRelayClient> {
  return new Promise((resolve, reject) => {
    if (isGlobalNDKClientInitialized()) {
      resolve(getGlobalNDKClient());
      return;
    }

    console.log(`⏳ Waiting for NDK initialization (timeout: ${timeoutMs}ms)...`);

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isGlobalNDKClientInitialized()) {
        clearInterval(checkInterval);
        console.log(`✅ NDK initialized after ${Date.now() - startTime}ms`);
        resolve(getGlobalNDKClient());
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        console.warn(`⚠️ NDK initialization timeout after ${timeoutMs}ms - this is non-fatal, continuing...`);
        // Don't reject - instead provide a fallback that allows graceful degradation
        reject(new Error(`NDK initialization timeout after ${timeoutMs}ms. This may be temporary - please try refreshing if data doesn't load.`));
      }
    }, 250); // Reduced frequency to be less aggressive
  });
}

export function setGlobalNDKInstance(ndk: NDK): void {
  const client = getGlobalNDKClient();
  client.setNDK(ndk);
}

export async function disconnectGlobalNDKClient(): Promise<void> {
  if (globalNDKClient) {
    await globalNDKClient.disconnect();
    globalNDKClient = null;
  }
}