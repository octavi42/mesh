/**
 * React Hook for Nostr Integration
 * Provides easy-to-use Nostr functionality with proper state management
 */

import { useState, useEffect, useCallback } from 'react';
import { nostrWebAdapter, type NostrConnectionState } from '@/lib/nostr/web-adapter';

export interface UseNostrResult {
  // Connection state
  isAvailable: boolean;
  isConnected: boolean;
  isLoading: boolean;
  extensionName?: string;
  pubkey?: string;
  error?: string;

  // Actions
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  signEvent: (event: any) => Promise<any>;
  getPublicKey: () => Promise<string>;
  getRelays: () => Promise<Record<string, any> | null>;

  // Utilities
  supportsNIP: (nipNumber: number) => boolean;
}

/**
 * Custom hook for Nostr functionality
 */
export function useNostr(): UseNostrResult {
  const [state, setState] = useState<NostrConnectionState>(nostrWebAdapter.getState());

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = nostrWebAdapter.onStateChange(setState);
    return unsubscribe;
  }, []);

  // Connect to extension
  const connect = useCallback(async () => {
    try {
      await nostrWebAdapter.connect();
    } catch (error) {
      console.error('Failed to connect to Nostr extension:', error);
    }
  }, []);

  // Refresh connection
  const refresh = useCallback(async () => {
    try {
      await nostrWebAdapter.refresh();
    } catch (error) {
      console.error('Failed to refresh Nostr connection:', error);
    }
  }, []);

  // Sign event
  const signEvent = useCallback(async (event: any) => {
    return await nostrWebAdapter.signEvent(event);
  }, []);

  // Get public key
  const getPublicKey = useCallback(async () => {
    return await nostrWebAdapter.getPublicKey();
  }, []);

  // Get relays
  const getRelays = useCallback(async () => {
    return await nostrWebAdapter.getRelays();
  }, []);

  // Check NIP support
  const supportsNIP = useCallback((nipNumber: number) => {
    return nostrWebAdapter.supportsNIP(nipNumber);
  }, []);

  return {
    // State
    isAvailable: state.isAvailable,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    extensionName: state.extensionName,
    pubkey: state.pubkey,
    error: state.error,

    // Actions
    connect,
    refresh,
    signEvent,
    getPublicKey,
    getRelays,

    // Utilities
    supportsNIP,
  };
}

/**
 * Hook for checking if Nostr is ready for use
 */
export function useNostrReady(): boolean {
  const { isAvailable, isConnected, isLoading } = useNostr();
  return isAvailable && isConnected && !isLoading;
}

/**
 * Hook that automatically connects when extension becomes available
 */
export function useNostrAutoConnect(): UseNostrResult {
  const nostr = useNostr();

  useEffect(() => {
    if (nostr.isAvailable && !nostr.isConnected && !nostr.isLoading) {
      nostr.connect().catch(console.error);
    }
  }, [nostr.isAvailable, nostr.isConnected, nostr.isLoading, nostr.connect]);

  return nostr;
}