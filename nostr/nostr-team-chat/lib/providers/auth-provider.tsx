'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useNDK } from '@/lib/hooks/use-ndk';
import { toast } from 'sonner';
import NDK, { NDKNip46Signer, NDKNip07Signer } from '@nostr-dev-kit/ndk';

// Global flag to prevent multiple initializations
let isNostrLoginInitialized = false;
let nostrLoginPromise: Promise<void> | null = null;

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { setPubkey, clearAuth } = useAuthStore();
  const { attachSigner } = useNDK();
  const hasInitialized = useRef(false);

  // Access store functions directly without re-creating them

  useEffect(() => {
    // Prevent multiple initializations from the same component
    if (hasInitialized.current) {
      console.log('🔄 AuthProvider already initialized in this instance, skipping');
      return;
    }

    console.log('🚀 AuthProvider mounted - setting up nostr-login');

    const initializeAuthentication = async () => {
      // Global singleton check - only one initialization across all instances
      if (isNostrLoginInitialized) {
        console.log('ℹ️ nostr-login already initialized globally, checking for existing session');
        await checkForExistingSession();
        return;
      }

      // If another initialization is in progress, wait for it
      if (nostrLoginPromise) {
        console.log('⏳ Waiting for ongoing nostr-login initialization...');
        try {
          await nostrLoginPromise;
          await checkForExistingSession();
          return;
        } catch (error) {
          console.log('⚠️ Previous initialization failed, trying again');
        }
      }

      // Start new initialization
      nostrLoginPromise = performNostrLoginInit();

      try {
        await nostrLoginPromise;
        isNostrLoginInitialized = true;
        console.log('✅ nostr-login initialized successfully');

        // Check for existing session after initialization
        await checkForExistingSession();

      } catch (error) {
        console.error('❌ Failed to initialize nostr-login:', error);
        nostrLoginPromise = null; // Reset promise so it can be retried

        if (error instanceof Error && error.message.includes('Already started')) {
          console.log('ℹ️ nostr-login already started by another instance, checking for existing session');
          isNostrLoginInitialized = true;
          await checkForExistingSession();
        } else {
          // Clear auth state if initialization completely failed
          clearAuth();
        }
      }
    };

    const performNostrLoginInit = async () => {
      const { init } = await import('nostr-login');
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      console.log('🔄 Initializing nostr-login with EXTENSION-FIRST priority (NIP-42 support)');

      // PRIORITY CHANGE: Extension first for NIP-42 auth support
      // NIP-46 (bunker) cannot handle NIP-42 AUTH challenges from relays
      // Extensions (NIP-07) CAN handle NIP-42 auth properly
      const methods = isMobile
        ? 'extension,connect,local,readOnly' // Even on mobile, check extension first
        : 'extension,connect,local,readOnly'; // Desktop: definitely extension first

      await init({
        methods,
        bunkers: 'nsec.app,njump.me,highlighter.com', // Keep bunker as fallback
        theme: 'default',
        darkMode: typeof window !== 'undefined' &&
          (localStorage.getItem('theme') === 'dark' ||
           document.documentElement.classList.contains('dark')),
        perms: 'sign_event:1,sign_event:9,sign_event:55,nip04_encrypt,nip44_encrypt',
        noBanner: true,
        rememberMe: true,
        // Don't auto-require extension to avoid blocking users without one
        isSignInWithExtension: false,
      });

      console.log('✅ nostr-login initialized with EXTENSION-FIRST methods:', methods);
    };

    const checkForExistingSession = async () => {
      console.log('🔍 Checking for existing nostr session');

      const storedPubkey = localStorage.getItem('nostr-pubkey');
      const authMethod = localStorage.getItem('nostr-auth-method');

      // PRIORITY: Try extension session FIRST (best for NIP-42)
      if (authMethod === 'extension' && typeof window !== 'undefined' && window.nostr) {
        try {
          console.log('🔍 Checking for extension session (EXTENSION-FIRST strategy)');
          const pubkey = await window.nostr.getPublicKey();
          console.log('✅ Extension session found! Pubkey:', pubkey?.slice(0, 8));
          setPubkey(pubkey);
          return true;
        } catch (error) {
          console.log('⚠️ No active extension session');
        }
      }

      // Try NIP-46 session (fallback, but will have NIP-42 issues)
      const storedBunkerToken = localStorage.getItem('nostr-bunker-token');
      if (storedBunkerToken && storedPubkey && authMethod === 'nip46') {
        console.log('🔐 Found stored NIP-46 session (bunker token), NIP-42 auth will fail');

        // Note: NIP-46 can't handle NIP-42 AUTH challenges
        // User will need to manually reconnect via extension for full functionality
        setPubkey(storedPubkey);

        toast.warning('⚠️ NIP-46 session restored with limitations', {
          description: 'Browser extensions (Alby/nos2x) provide better NIP-42 support. Please install one for the best experience.'
        });
        return true;
      }

      // Try local/private key session
      if (authMethod === 'local' && typeof window !== 'undefined' && window.nostr) {
        try {
          const pubkey = await window.nostr.getPublicKey();
          console.log('✅ Local key session found! Pubkey:', pubkey?.slice(0, 8));
          setPubkey(pubkey);
          return true;
        } catch (error) {
          console.log('⚠️ No local key session');
        }
      }

      console.log('ℹ️ No existing session found, user needs to login');
      clearAuth();
      return false;
    };

    // Set up nostr-login event listener (only once per component instance)
    const handleAuth = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const authType = customEvent.detail.type;
      const method = customEvent.detail.method;

      console.log('📡 nlAuth event received:', {
        authType,
        method,
        detail: customEvent.detail,
        'window.nostr exists': !!window.nostr,
        instance: hasInitialized.current
      });

      if (authType === 'login' || authType === 'signup') {
        console.log('✅ User authenticated via nostr-login using method:', method);

        if (typeof window !== 'undefined' && window.nostr) {
          try {
            const pubkey = await window.nostr.getPublicKey();
            console.log('🔑 Setting pubkey from nlAuth:', pubkey?.slice(0, 8));
            setPubkey(pubkey);

            // Store pubkey and auth method
            localStorage.setItem('nostr-pubkey', pubkey);

            // For NIP-46, create direct NDK signer (bypass window.nostr popup issues)
            const bunkerToken = customEvent.detail.bunkerToken || customEvent.detail.token;
            if (bunkerToken && method === 'connect') {
              console.log('🔐 Creating direct NIP-46 signer with bunker token');
              localStorage.setItem('nostr-bunker-token', bunkerToken);
              localStorage.setItem('nostr-auth-method', 'nip46');

              // Create NDK instance with direct NIP-46 signer
              const ndkInstance = new NDK({
                explicitRelayUrls: ['wss://relay.nsec.app', 'wss://groups.contextio.app'],
              });

              const { NDKNip46Signer } = await import('@nostr-dev-kit/ndk');
              const signer = new NDKNip46Signer(ndkInstance, pubkey, bunkerToken);
              ndkInstance.signer = signer;

              // Set up for global use
              const { setGlobalNDKInstance } = await import('@/lib/nostr/ndk-relay-client');
              setGlobalNDKInstance(ndkInstance);

              console.log('✅ Direct NIP-46 signer created and ready');
            } else if (method === 'extension') {
              localStorage.setItem('nostr-auth-method', 'extension');
              // Note: Extension signer will be handled by NDKProvider
            } else if (method === 'local') {
              localStorage.setItem('nostr-auth-method', 'local');
              // Note: Local signer will be handled by NDKProvider
            }

            toast.success('✅ Login successful', {
              description: `Connected via ${method === 'connect' ? 'Nostr Connect' : method === 'extension' ? 'browser extension' : 'local key'}`
            });
          } catch (error) {
            console.error('❌ Failed to get pubkey after auth:', error);
            toast.error('Authentication failed', {
              description: 'Please try logging in again.'
            });
          }
        }
      } else if (authType === 'logout') {
        console.log('🚪 User logged out via nostr-login');
        clearAuth();

        // Clear stored tokens
        localStorage.removeItem('nostr-bunker-token');
        localStorage.removeItem('nostr-auth-method');

        console.log('🔀 Redirecting to /');
        router.push('/');
      }
    };

    // Mark this instance as initialized
    hasInitialized.current = true;

    // Listen for nostr-login events
    document.addEventListener('nlAuth', handleAuth);

    // Initialize authentication
    initializeAuthentication();

    return () => {
      document.removeEventListener('nlAuth', handleAuth);
      hasInitialized.current = false;
    };
  }, []); // Empty dependency array - all functions are stable

  return <>{children}</>;
}