// Transition helper to replace getGlobalNIP29Client with getGlobalNDKClient
// This allows for gradual migration while maintaining API compatibility

export {
  getGlobalNDKClient as getGlobalNIP29Client,
  disconnectGlobalNDKClient as disconnectGlobalClient,
  isGlobalNDKClientInitialized,
  waitForNDKInitialization
} from '@/lib/nostr/ndk-relay-client';

// Re-export types for compatibility
export type { NostrEvent, EventHandler, EOSEHandler } from '@/lib/nostr/nip29/types';