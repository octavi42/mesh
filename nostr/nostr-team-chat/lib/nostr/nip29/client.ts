// MIGRATION: This file now redirects to the NDK-based implementation
// The old nostr-tools based client has been replaced to fix authentication issues

export {
  getGlobalNDKClient as getGlobalNIP29Client,
  disconnectGlobalNDKClient as disconnectGlobalClient,
  NDKRelayClient as NIP29RelayClient
} from '@/lib/nostr/ndk-relay-client';

// Re-export types for compatibility
export type { NostrEvent, EventHandler, EOSEHandler } from './types';