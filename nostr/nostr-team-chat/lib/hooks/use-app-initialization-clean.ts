import { useEffect, useState } from 'react';
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
  const { ndk, attachSigner } = useNDK();
  const [state, setState] = useState<AppInitState>({
    isInitialized: false,
    isInitializing: false,
    error: null
  });

  // NOTE: NIP-29 workspace initialization moved to protected layout for persistence

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
      return;
    }

    // Skip if already initialized or missing dependencies
    if (state.isInitialized || state.isInitializing || !ndk || !pubkey) {
      return;
    }

    const initializeApp = async () => {
      setState(prev => ({ ...prev, isInitializing: true, error: null }));

      try {
        console.log('🚀 Initializing app for authenticated user:', pubkey.slice(0, 8));

        // Create a signer from window.nostr if available
        let signerAttached = false;

        if (typeof window !== 'undefined' && window.nostr) {
          console.log('🔑 Creating NDK signer from window.nostr');

          const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
          const signer = new NDKNip07Signer();

          // Attach signer to NDK
          await attachSigner(signer);
          console.log('✅ Signer attached to NDK');
          signerAttached = true;
        } else {
          console.warn('⚠️ window.nostr not available initially, will retry when nostr-login is ready');
        }

        // If signer wasn't attached, set up a retry mechanism for when nostr-login becomes ready
        if (!signerAttached && typeof window !== 'undefined') {
          const retrySignerAttachment = async () => {
            if (window.nostr && !signerAttached) {
              try {
                console.log('🔑 Retrying NDK signer attachment after nostr-login ready');
                const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
                const signer = new NDKNip07Signer();
                await attachSigner(signer);
                console.log('✅ Signer attached to NDK (retry)');
                signerAttached = true;
              } catch (error) {
                console.error('❌ Failed to retry signer attachment:', error);
              }
            }
          };

          // Retry after a delay to allow nostr-login to initialize
          setTimeout(retrySignerAttachment, 2000);
          setTimeout(retrySignerAttachment, 5000);
          setTimeout(retrySignerAttachment, 10000);
        }

        // App is now ready for Nostr operations
        setState({
          isInitialized: true,
          isInitializing: false,
          error: null
        });

        console.log('✅ App initialization complete');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
        console.error('❌ App initialization failed:', errorMessage);

        setState({
          isInitialized: false,
          isInitializing: false,
          error: errorMessage
        });
      }
    };

    initializeApp();
  }, [isAuthenticated, pubkey, ndk, state.isInitialized, state.isInitializing, attachSigner]);

  return state;
}