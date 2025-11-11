/**
 * React Hook for Nostr Integration using nostr-login
 * Simplified version that relies on nostr-login for all authentication
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

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
  reconnect: () => Promise<void>;
  signEvent: (event: Record<string, unknown>) => Promise<Record<string, unknown>>;
  getPublicKey: () => Promise<string>;
  getRelays: () => Promise<Record<string, unknown> | null>;

  // Utilities
  supportsNIP: (nipNumber: number) => boolean;
  checkHealth: () => Promise<{ healthy: boolean; error?: string }>;
}

/**
 * Custom hook for Nostr functionality using nostr-login
 */
export function useNostr(): UseNostrResult {
  const { isAuthenticated, pubkey } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [extensionName, setExtensionName] = useState<string>('');

  // Check if window.nostr is available
  const isAvailable = typeof window !== 'undefined' && !!window.nostr;

  // Detect extension name
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).alby) {
      setExtensionName('Alby');
    } else if ((window as any).nos2x) {
      setExtensionName('nos2x');
    } else if (window.nostr) {
      // Check if it's nostr-login managed
      setExtensionName('Nostr Login');
    }
  }, [isAvailable]);

  // Launch nostr-login modal for authentication
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const { launch } = await import('nostr-login');
      await launch('welcome');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to launch nostr-login';
      setError(errorMessage);
      console.error('Failed to launch nostr-login:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh connection (same as connect for nostr-login)
  const refresh = useCallback(async () => {
    await connect();
  }, [connect]);

  // Manual reconnect (same as connect for nostr-login)
  const reconnect = useCallback(async () => {
    await connect();
  }, [connect]);

  // Sign event using window.nostr
  const signEvent = useCallback(async (event: Record<string, unknown>) => {
    if (!window.nostr) {
      throw new Error('Nostr not available. Please connect first.');
    }

    try {
      return await window.nostr.signEvent(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign event';

      if (errorMessage.includes('not found') || errorMessage.includes('undefined')) {
        throw new Error('Connection to key storage lost. Please check if nsec.app tab is still open and reconnect.');
      }

      throw new Error(errorMessage);
    }
  }, []);

  // Get public key using window.nostr
  const getPublicKey = useCallback(async () => {
    if (!window.nostr) {
      throw new Error('Nostr not available. Please connect first.');
    }

    try {
      return await window.nostr.getPublicKey();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get public key';

      if (errorMessage.includes('not found') || errorMessage.includes('undefined')) {
        throw new Error('Connection to key storage lost. Please check if nsec.app tab is still open and reconnect.');
      }

      throw new Error(errorMessage);
    }
  }, []);

  // Get relays from extension
  const getRelays = useCallback(async () => {
    if (!window.nostr) return null;

    try {
      if ((window.nostr as any).getRelays) {
        return await (window.nostr as any).getRelays();
      }
      return null;
    } catch (error) {
      console.warn('Failed to get relays from extension:', error);
      return null;
    }
  }, []);

  // Check NIP support
  const supportsNIP = useCallback((nipNumber: number) => {
    if (!window.nostr) return false;

    switch (nipNumber) {
      case 4: // NIP-04 (encrypted DMs)
        return !!(window.nostr as any).nip04;
      case 44: // NIP-44 (encrypted events)
        return !!(window.nostr as any).nip44;
      default:
        return false;
    }
  }, []);

  // Check extension health
  const checkHealth = useCallback(async () => {
    if (!window.nostr) {
      return { healthy: false, error: 'Extension not found' };
    }

    try {
      const pubkey = await Promise.race([
        window.nostr.getPublicKey(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      return { healthy: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not found') || errorMessage.includes('undefined')) {
        return { healthy: false, error: 'Connection to key storage lost - nsec.app tab may be closed' };
      }

      return { healthy: false, error: errorMessage };
    }
  }, []);

  return {
    // State - derived from auth store and window.nostr
    isAvailable,
    isConnected: isAuthenticated && !!pubkey && isAvailable,
    isLoading,
    extensionName: extensionName || 'Nostr Extension',
    pubkey,
    error,

    // Actions
    connect,
    refresh,
    reconnect,
    signEvent,
    getPublicKey,
    getRelays,

    // Utilities
    supportsNIP,
    checkHealth,
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
 * Note: With nostr-login, this is handled automatically, so this just returns the nostr state
 */
export function useNostrAutoConnect(): UseNostrResult {
  return useNostr();
}