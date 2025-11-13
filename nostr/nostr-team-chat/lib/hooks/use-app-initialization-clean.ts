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
  const { ndk, attachSigner } = useNDK();
  const [state, setState] = useState<AppInitState>({
    isInitialized: false,
    isInitializing: false,
    error: null
  });
  const [initializationTimeout, setInitializationTimeout] = useState<NodeJS.Timeout | null>(null);
  const initializationAttemptedRef = useRef(false);

  // NOTE: NIP-29 workspace initialization moved to protected layout for persistence

  // Add relay connectivity test
  useRelayTest();

  useEffect(() => {
    console.log('🔍 App initialization effect triggered:', {
      isAuthenticated,
      hasNdk: !!ndk,
      hasPubkey: !!pubkey,
      pubkey: pubkey?.slice(0, 8),
      currentState: state
    });

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

    // Skip if already initialized or missing dependencies
    if (state.isInitialized || state.isInitializing || !ndk || !pubkey || initializationAttemptedRef.current) {
      console.log('🔍 Skipping initialization:', {
        isInitialized: state.isInitialized,
        isInitializing: state.isInitializing,
        hasNdk: !!ndk,
        hasPubkey: !!pubkey,
        pubkey: pubkey?.slice(0, 8),
        attemptedAlready: initializationAttemptedRef.current
      });
      return;
    }

    const initializeApp = async () => {
      console.log('🚀 Starting app initialization process...');
      initializationAttemptedRef.current = true;
      setState(prev => ({ ...prev, isInitializing: true, error: null }));

      // Clear any existing timeout
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }

      // Set a timeout to prevent infinite initialization, but don't force completion
      const timeout = setTimeout(() => {
        console.warn('⚠️ Initialization taking longer than expected, but continuing...');
        // Don't force state change - let the process complete naturally
        // This prevents forced page refreshes from abrupt state changes
      }, 30000); // 30 second timeout, but non-destructive

      setInitializationTimeout(timeout);

      try {
        console.log('🚀 Initializing app for authenticated user:', pubkey.slice(0, 8));

        // Auto-attach signer for seamless user experience
        console.log('🔌 Auto-connecting to relays for seamless experience...');
        console.log('🔍 Current state:', { hasNDK: !!ndk, pubkey: pubkey.slice(0, 8) });

        try {
          console.log('🔍 Starting auto-connection process...');

          // Check for existing auth session and auto-connect
          const storedAuthMethod = localStorage.getItem('nostr-auth-method');
          const hasExtension = typeof window !== 'undefined' && window.nostr;

          // Detect nsec.app usage: no stored auth method but has window.nostr and we're not on nsec.app domain
          const isNsecApp = !storedAuthMethod && hasExtension && window.location.hostname !== 'nsec.app';

          // Handle different auth method determination
          let authMethod;
          if (isNsecApp) {
            authMethod = 'nsec';
          } else if (storedAuthMethod) {
            authMethod = storedAuthMethod;
          } else if (hasExtension) {
            // If we have window.nostr but no stored method, assume it's available for auto-connection
            authMethod = 'extension';
          } else {
            authMethod = null;
          }

          console.log('🔍 Auto-connection attempt:', { authMethod, hasExtension, isNsecApp, storedAuthMethod });

          if (authMethod && ndk) {
            let signer;

            if ((authMethod === 'extension' || authMethod === 'nsec') && hasExtension) {
              const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
              signer = new NDKNip07Signer();
              console.log(`🔑 Created ${authMethod} signer for auto-connect`);
            } else if (authMethod === 'nip46') {
              const bunkerToken = localStorage.getItem('nostr-bunker-token');
              if (bunkerToken) {
                const { NDKNip46Signer } = await import('@nostr-dev-kit/ndk');
                signer = new NDKNip46Signer(ndk, pubkey, bunkerToken);
                console.log('🔑 Created NIP-46 signer for auto-connect');
              }
            } else if (authMethod === 'local' && hasExtension) {
              const { NDKNip07Signer } = await import('@nostr-dev-kit/ndk');
              signer = new NDKNip07Signer();
              console.log('🔑 Created local signer for auto-connect');
            }

            if (signer) {
              console.log('🚀 Attempting auto-connection with signer...');
              try {
                // Add timeout to signer attachment to prevent hanging
                await Promise.race([
                  attachSigner(signer),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Signer attachment timeout')), 15000)
                  )
                ]);
                console.log('✅ Auto-connection successful! Signer attached.');

                // Reset workspace session to allow fresh fetch after signer attachment
                const { resetWorkspaceSession } = await import('../hooks/use-nip29-workspaces');
                resetWorkspaceSession();
              } catch (signerError) {
                console.warn('⚠️ Signer attachment failed or timed out:', signerError);
                // Continue with initialization even if signer attachment fails
              }
            } else {
              console.log('⚠️ No suitable signer found for auto-connect');
            }
          } else {
            console.log('ℹ️ No stored auth method found, skipping auto-connect');
          }

          console.log('✅ Auto-connection process completed');
        } catch (error) {
          console.warn('⚠️ Auto-connection failed, user can manually connect later:', error);
          // Don't throw - let the app continue and user can manually connect
          // Clear any error state to prevent interface issues
        }

        // Clear the timeout since initialization completed successfully
        console.log('🧹 Clearing initialization timeout...');
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
          setInitializationTimeout(null);
        }

        // App is now ready for Nostr operations
        console.log('✅ Setting app to initialized state...');
        setState({
          isInitialized: true,
          isInitializing: false,
          error: null
        });

        console.log('✅ App initialization complete - state updated');
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
  }, [isAuthenticated, pubkey, ndk, attachSigner]);

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