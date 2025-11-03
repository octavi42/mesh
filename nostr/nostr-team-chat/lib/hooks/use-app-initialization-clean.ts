import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNDK } from './use-ndk';
import { useNIP29Workspaces } from './use-nip29-workspaces';
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

  // Start NIP-29 subscriptions (this hook manages its own lifecycle)
  useNIP29Workspaces();

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
        if (typeof window !== 'undefined' && window.nostr) {
          console.log('🔑 Creating NDK signer from window.nostr');

          const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
          const signer = new NDKNip07Signer();

          // Attach signer to NDK
          await attachSigner(signer);
          console.log('✅ Signer attached to NDK');
        } else {
          console.warn('⚠️ window.nostr not available, events cannot be signed');
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