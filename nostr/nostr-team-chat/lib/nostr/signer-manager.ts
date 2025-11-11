import NDK, { NDKNip46Signer, NDKNip07Signer } from '@nostr-dev-kit/ndk';

/**
 * Creates the appropriate signer based on stored auth method
 * This handles NIP-46 (bunker), NIP-07 (extension), and local keys
 */
export interface SignerConfig {
  signer: NDKNip46Signer | NDKNip07Signer;
  authMethod: 'nip46' | 'extension' | 'local' | null;
  bunkerToken?: string;
}

export async function createNDKSigner(ndk: NDK): Promise<SignerConfig> {
  const authMethod = localStorage.getItem('nostr-auth-method');
  const bunkerToken = localStorage.getItem('nostr-bunker-token');
  const pubkey = localStorage.getItem('nostr-pubkey');

  console.log('🔑 SignerManager: Creating signer', {
    authMethod,
    hasBunkerToken: !!bunkerToken,
    hasPubkey: !!pubkey,
  });

  // Try NIP-46 first (most reliable)
  if (authMethod === 'nip46' && bunkerToken && pubkey) {
    console.log('🔐 Creating NIP-46 signer with bunker token');
    try {
      // Parse bunker URL format: bunker://<pubkey>?relay=<relay>
      const signer = new NDKNip46Signer(ndk, pubkey, bunkerToken);

      // Test the signer
      await signer.user();

      console.log('✅ NIP-46 signer created and verified');
      return {
        signer,
        authMethod: 'nip46',
        bunkerToken
      };
    } catch (error) {
      console.error('❌ Failed to create NIP-46 signer:', error);
      toast.error('Nostr Connect session failed', {
        description: 'Please reconnect via NIPP-46'
      });
      // Fall through to extension
    }
  }

  // Try extension (NIP-07)
  if (typeof window !== 'undefined' && window.nostr) {
    console.log('🔌 Creating NIP-07 extension signer');
    try {
      const signer = new NDKNip07Signer();
      await signer.user();
      console.log('✅ NIP-07 extension signer created');
      return {
        signer,
        authMethod: 'extension',
        bunkerToken: undefined
      };
    } catch (error) {
      console.warn('⚠️ Extension signer not available:', error);
    }
  }

  console.log('ℹ️ No suitable signer found, user needs to authenticate');
  return {
    signer: new NDKNip07Signer(), // Fallback but won't work
    authMethod: null,
    bunkerToken: undefined
  };
}

/**
 * Gets the bunker relays to connect to for NIP-46
 */
export function getBunkerRelays(): string[] {
  return [
    'wss://relay.nsec.app',
    'wss://relay.njump.me',
  ];
}

/**
 * Checks if the current auth method requires special relay connections
 */
export function requiresBunkerRelay(authMethod: string | null): boolean {
  return authMethod === 'nip46' || authMethod === 'connect';
}

/**
 * Clears stored auth data
 */
export function clearStoredAuth(): void {
  localStorage.removeItem('nostr-bunker-token');
  localStorage.removeItem('nostr-auth-method');
  localStorage.removeItem('nostr-pubkey');
}

/**
 * Gets current auth status
 */
export function getAuthStatus() {
  return {
    hasBunkerToken: !!localStorage.getItem('nostr-bunker-token'),
    authMethod: localStorage.getItem('nostr-auth-method'),
    pubkey: localStorage.getItem('nostr-pubkey'),
  };
}