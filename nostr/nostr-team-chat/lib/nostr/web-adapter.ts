/**
 * Nostr Web App Adapter
 * Provides robust Nostr extension detection, fallbacks, and web app integration
 */

export interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(event: any): Promise<any>;
  getRelays?(): Promise<Record<string, any>>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

export interface NostrConnectionState {
  isAvailable: boolean;
  isConnected: boolean;
  extensionName?: string;
  pubkey?: string;
  error?: string;
  isLoading: boolean;
}

export type NostrConnectionCallback = (state: NostrConnectionState) => void;

export class NostrWebAdapter {
  private static instance: NostrWebAdapter;
  private callbacks: Set<NostrConnectionCallback> = new Set();
  private state: NostrConnectionState = {
    isAvailable: false,
    isConnected: false,
    isLoading: false,
  };
  private detectionAttempts = 0;
  private maxDetectionAttempts = 50; // 5 seconds with 100ms intervals
  private detectionInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeDetection();
  }

  static getInstance(): NostrWebAdapter {
    if (!NostrWebAdapter.instance) {
      NostrWebAdapter.instance = new NostrWebAdapter();
    }
    return NostrWebAdapter.instance;
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(callback: NostrConnectionCallback): () => void {
    this.callbacks.add(callback);
    // Immediately call with current state
    callback(this.state);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get current connection state
   */
  getState(): NostrConnectionState {
    return { ...this.state };
  }

  /**
   * Initialize extension detection
   */
  private initializeDetection(): void {
    if (typeof window === 'undefined') {
      this.updateState({ isAvailable: false, error: 'Not in browser environment' });
      return;
    }

    this.updateState({ isLoading: true });
    this.startDetection();
  }

  /**
   * Start detecting Nostr extensions
   */
  private startDetection(): void {
    this.detectionInterval = setInterval(() => {
      this.detectionAttempts++;

      if (this.detectExtension()) {
        this.stopDetection();
        this.connectToExtension();
      } else if (this.detectionAttempts >= this.maxDetectionAttempts) {
        this.stopDetection();
        this.updateState({
          isAvailable: false,
          isLoading: false,
          error: 'Nostr extension not found. Please install a Nostr extension like Alby or nos2x.',
        });
      }
    }, 100);
  }

  /**
   * Stop detection interval
   */
  private stopDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined;
    }
  }

  /**
   * Detect available Nostr extensions
   */
  private detectExtension(): boolean {
    if (!window.nostr) {
      return false;
    }

    // Detect extension type
    let extensionName = 'Unknown';
    if ((window as any).alby) {
      extensionName = 'Alby';
    } else if ((window as any).nos2x) {
      extensionName = 'nos2x';
    } else if (window.nostr) {
      extensionName = 'Generic Nostr Extension';
    }

    this.updateState({
      isAvailable: true,
      extensionName,
      isLoading: false,
    });

    return true;
  }

  /**
   * Connect to the detected extension
   */
  private async connectToExtension(): Promise<void> {
    try {
      this.updateState({ isLoading: true });

      const pubkey = await window.nostr!.getPublicKey();

      this.updateState({
        isConnected: true,
        pubkey,
        isLoading: false,
        error: undefined,
      });

      console.log('✅ Connected to Nostr extension:', {
        extension: this.state.extensionName,
        pubkey: pubkey.slice(0, 8) + '...',
      });

    } catch (error) {
      console.error('❌ Failed to connect to Nostr extension:', error);
      this.updateState({
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect to extension',
      });
    }
  }

  /**
   * Manually trigger connection attempt
   */
  async connect(): Promise<void> {
    if (!this.state.isAvailable) {
      throw new Error('Nostr extension not available');
    }

    await this.connectToExtension();
  }

  /**
   * Sign an event using the connected extension
   */
  async signEvent(event: any): Promise<any> {
    if (!this.state.isConnected || !window.nostr) {
      throw new Error('Nostr extension not connected');
    }

    try {
      return await window.nostr.signEvent(event);
    } catch (error) {
      console.error('❌ Failed to sign event:', error);
      throw error;
    }
  }

  /**
   * Get public key from connected extension
   */
  async getPublicKey(): Promise<string> {
    if (!this.state.isConnected || !window.nostr) {
      throw new Error('Nostr extension not connected');
    }

    try {
      return await window.nostr.getPublicKey();
    } catch (error) {
      console.error('❌ Failed to get public key:', error);
      throw error;
    }
  }

  /**
   * Check if specific NIP is supported
   */
  supportsNIP(nipNumber: number): boolean {
    if (!window.nostr) return false;

    switch (nipNumber) {
      case 4: // NIP-04 (encrypted DMs)
        return !!(window.nostr as any).nip04;
      case 44: // NIP-44 (encrypted events)
        return !!(window.nostr as any).nip44;
      default:
        return false;
    }
  }

  /**
   * Get available relays from extension
   */
  async getRelays(): Promise<Record<string, any> | null> {
    if (!this.state.isConnected || !window.nostr) {
      return null;
    }

    try {
      if ((window.nostr as any).getRelays) {
        return await (window.nostr as any).getRelays();
      }
      return null;
    } catch (error) {
      console.warn('Failed to get relays from extension:', error);
      return null;
    }
  }

  /**
   * Update internal state and notify callbacks
   */
  private updateState(updates: Partial<NostrConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.callbacks.forEach(callback => callback(this.state));
  }

  /**
   * Refresh connection state
   */
  async refresh(): Promise<void> {
    this.detectionAttempts = 0;
    this.updateState({ isLoading: true, error: undefined });

    if (this.detectExtension()) {
      await this.connectToExtension();
    } else {
      this.startDetection();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopDetection();
    this.callbacks.clear();
  }
}

// Export singleton instance
export const nostrWebAdapter = NostrWebAdapter.getInstance();

// Global type declarations
declare global {
  interface Window {
    nostr?: NostrExtension;
    alby?: any;
    nos2x?: any;
  }
}