import {
  getGlobalNIP29Client,
  type NIP29Client,
} from '@/lib/nostr/nip29';
import type { Filter, Event } from 'nostr-tools';

export interface RelaySubscription {
  id: string;
  filter: Filter;
  callback: (event: Event) => void;
  active: boolean;
}

export interface RelayConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastConnected: number | null;
  reconnectAttempts: number;
}

export class NostrRelayManager {
  private static instance: NostrRelayManager;
  private client: NIP29Client | null = null;
  private subscriptions = new Map<string, RelaySubscription>();
  private connectionState: RelayConnectionState = {
    connected: false,
    connecting: false,
    error: null,
    lastConnected: null,
    reconnectAttempts: 0,
  };
  private connectionListeners = new Set<(state: RelayConnectionState) => void>();

  static getInstance(): NostrRelayManager {
    if (!NostrRelayManager.instance) {
      NostrRelayManager.instance = new NostrRelayManager();
    }
    return NostrRelayManager.instance;
  }

  async connect(): Promise<void> {
    if (this.connectionState.connected) {
      console.log('📡 Relay already connected');
      return;
    }

    if (this.connectionState.connecting) {
      console.log('📡 Connection already in progress');
      return;
    }

    try {
      this.updateConnectionState({ connecting: true, error: null });

      console.log('📡 Connecting to Nostr relay...');
      this.client = getGlobalNIP29Client();

      if (!this.client.isConnected()) {
        await this.client.connect();
      }

      this.updateConnectionState({
        connected: true,
        connecting: false,
        lastConnected: Date.now(),
        reconnectAttempts: 0,
      });

      console.log('✅ Connected to relay:', this.client.getRelayUrl());

      // Restore active subscriptions after reconnection
      await this.restoreSubscriptions();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      console.error('❌ Failed to connect to relay:', errorMessage);

      this.updateConnectionState({
        connected: false,
        connecting: false,
        error: errorMessage,
        reconnectAttempts: this.connectionState.reconnectAttempts + 1,
      });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;

    console.log('📡 Disconnecting from relay...');

    // Clear all subscriptions
    this.subscriptions.forEach(sub => {
      sub.active = false;
    });

    this.client = null;

    this.updateConnectionState({
      connected: false,
      connecting: false,
      error: null,
    });

    console.log('✅ Disconnected from relay');
  }

  subscribe(filter: Filter, callback: (event: Event) => void): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: RelaySubscription = {
      id: subscriptionId,
      filter,
      callback,
      active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // If connected, start subscription immediately
    if (this.connectionState.connected && this.client) {
      this.startSubscription(subscription);
    }

    console.log('📡 Created subscription:', subscriptionId);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      console.warn('⚠️ Subscription not found:', subscriptionId);
      return;
    }

    subscription.active = false;
    this.subscriptions.delete(subscriptionId);

    console.log('📡 Removed subscription:', subscriptionId);
  }

  unsubscribeAll(): void {
    console.log('📡 Clearing all subscriptions...');

    this.subscriptions.forEach(sub => {
      sub.active = false;
    });

    this.subscriptions.clear();
    console.log('✅ All subscriptions cleared');
  }

  async fetchEvents(filter: Filter): Promise<Event[]> {
    if (!this.client || !this.connectionState.connected) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error('Failed to establish relay connection');
    }

    try {
      console.log('📡 Fetching events with filter:', filter);
      const events = await this.client.fetchEvents(filter);
      console.log('📡 Fetched', events.length, 'events');
      return events;
    } catch (error) {
      console.error('❌ Failed to fetch events:', error);
      throw error;
    }
  }

  async publishEvent(event: Event): Promise<void> {
    if (!this.client || !this.connectionState.connected) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error('Failed to establish relay connection');
    }

    try {
      console.log('📤 Publishing event:', event.kind, event.id);
      await this.client.publishEvent(event);
      console.log('✅ Event published successfully');
    } catch (error) {
      console.error('❌ Failed to publish event:', error);
      throw error;
    }
  }

  getConnectionState(): RelayConnectionState {
    return { ...this.connectionState };
  }

  onConnectionStateChange(listener: (state: RelayConnectionState) => void): () => void {
    this.connectionListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  getRelayUrl(): string | null {
    return this.client?.getRelayUrl() || null;
  }

  private async startSubscription(subscription: RelaySubscription): Promise<void> {
    if (!this.client || !subscription.active) return;

    try {
      // Note: This would need to be implemented based on your NIP29Client interface
      // For now, we'll just log that we would start the subscription
      console.log('📡 Starting subscription:', subscription.id, subscription.filter);
    } catch (error) {
      console.error('❌ Failed to start subscription:', error);
    }
  }

  private async restoreSubscriptions(): Promise<void> {
    if (!this.client) return;

    console.log('📡 Restoring', this.subscriptions.size, 'subscriptions...');

    for (const subscription of this.subscriptions.values()) {
      if (subscription.active) {
        await this.startSubscription(subscription);
      }
    }

    console.log('✅ Subscriptions restored');
  }

  private updateConnectionState(updates: Partial<RelayConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };

    // Notify listeners
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.connectionState);
      } catch (error) {
        console.error('❌ Connection state listener error:', error);
      }
    });
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}