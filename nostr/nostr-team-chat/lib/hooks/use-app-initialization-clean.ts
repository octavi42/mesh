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
  const [initializationTimeout, setInitializationTimeout] = useState<NodeJS.Timeout | null>(null);

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

      // Clear any existing timeout
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }

      // Set a timeout to prevent infinite initialization
      const timeout = setTimeout(() => {
        console.warn('⚠️ Initialization timeout - forcing completion');
        setState({
          isInitialized: true,
          isInitializing: false,
          error: null
        });
      }, 15000); // 15 second timeout

      setInitializationTimeout(timeout);

      try {
        console.log('🚀 Initializing app for authenticated user:', pubkey.slice(0, 8));

        // Don't auto-attach signer - let user manually connect when they're ready
        console.log('✅ User is authenticated, but not auto-connecting to relays');
        console.log('💡 User can manually connect using the "Connect to Relay" button when ready');

        // Clear the timeout since initialization completed successfully
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
          setInitializationTimeout(null);
        }

        // App is now ready for Nostr operations
        setState({
          isInitialized: true,
          isInitializing: false,
          error: null
        });

        console.log('✅ App initialization complete');
      } catch (error) {
        // Clear the timeout on error
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
          setInitializationTimeout(null);
        }

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, [initializationTimeout]);

  return state;
}