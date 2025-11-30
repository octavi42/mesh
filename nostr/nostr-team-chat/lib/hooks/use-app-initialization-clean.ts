import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNDK } from './use-ndk';
import { useRelayTest } from './use-relay-test';

interface AppInitState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
}

export function useAppInitialization() {
  const { isAuthenticated, pubkey } = useAuthStore();
  const { ndk, attachSigner, hasSigner } = useNDK();
  const [state, setState] = useState<AppInitState>({
    isInitialized: false,
    isInitializing: false,
    error: null
  });
  const initializationAttemptedRef = useRef(false);

  // Add relay connectivity test
  useRelayTest();

  useEffect(() => {
    // Reset state when auth changes
    if (!isAuthenticated) {
      setState({
        isInitialized: false,
        isInitializing: false,
        error: null
      });
      initializationAttemptedRef.current = false;
      return;
    }

    // Skip if already initialized or initializing, or missing dependencies
    if (state.isInitialized || state.isInitializing || !ndk || !pubkey || initializationAttemptedRef.current) {
      return;
    }

    // If signer is already attached, mark as initialized immediately
    if (hasSigner) {
      console.log('✅ Signer already attached, app ready for:', pubkey.slice(0, 8));
      initializationAttemptedRef.current = true;
      
      // Still reset workspace session to ensure fresh fetch
      import('./use-nip29-workspaces').then(({ resetWorkspaceSession }) => {
        resetWorkspaceSession();
        console.log('🔄 Reset workspace session for existing signer');
      });
      
      setState({
        isInitialized: true,
        isInitializing: false,
        error: null
      });
      return;
    }

    // Need to attach signer
    const attachSignerAsync = async () => {
      console.log('🔌 Attaching signer for user:', pubkey.slice(0, 8));
      initializationAttemptedRef.current = true;
      setState(prev => ({ ...prev, isInitializing: true }));

      try {
        const storedAuthMethod = localStorage.getItem('nostr-auth-method');
        const hasExtension = typeof window !== 'undefined' && window.nostr;

        let authMethod = storedAuthMethod;
        if (!authMethod && hasExtension) {
          authMethod = 'extension';
        }

        if (authMethod && ndk) {
          let signer;

          if ((authMethod === 'extension' || authMethod === 'nsec' || authMethod === 'local') && hasExtension) {
            const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
            signer = new NDKNip07Signer();
            console.log(`🔑 Created ${authMethod} signer`);
          } else if (authMethod === 'nip46') {
            const bunkerToken = localStorage.getItem('nostr-bunker-token');
            if (bunkerToken) {
              const { NDKNip46Signer } = await import('@nostr-dev-kit/ndk');
              signer = new NDKNip46Signer(ndk, pubkey, bunkerToken);
              console.log('🔑 Created NIP-46 signer');
            }
          }

          if (signer) {
            // Note: attachSigner waits 5-10 seconds internally for NIP-42 auth to complete
            // We need a longer timeout to avoid race conditions
            await Promise.race([
              attachSigner(signer),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Signer timeout')), 15000)
              )
            ]);
            console.log('✅ Signer attached successfully');
            
            // Reset workspace session to trigger fresh fetch
            const { resetWorkspaceSession } = await import('./use-nip29-workspaces');
            resetWorkspaceSession();
          }
        }

        setState({
          isInitialized: true,
          isInitializing: false,
          error: null
        });
      } catch (error) {
        console.warn('⚠️ Signer attachment failed:', error);
        // Still mark as initialized - app can work without signer for some operations
        setState({
          isInitialized: true,
          isInitializing: false,
          error: null
        });
      }
    };

    attachSignerAsync();
  }, [isAuthenticated, pubkey, ndk, hasSigner, attachSigner, state.isInitialized, state.isInitializing]);

  return state;
}