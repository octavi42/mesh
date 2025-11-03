'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { setPubkey, clearAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    console.log('🚀 AuthProvider mounted - setting up auth listeners');

    // Initialize authentication state on mount
    const performCheckAuth = async () => {
      console.log('🔍 AuthProvider: Initial checkAuth');
      await checkAuth();

      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        console.log('✅ User is authenticated, initializing nostr-login');
        try {
          const { nostrLoginState } = await import('@/lib/nostr-login-state');

          if (!nostrLoginState.initialized) {
            console.log('🔄 Setting initialized flag before calling init()');
            nostrLoginState.initialized = true;

            const { init } = await import('nostr-login');
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            init({
              methods: isMobile ? ['local', 'extension', 'connect'] : ['local', 'extension', 'connect'],
              bunkers: isMobile ? 'nsec.app,njump.me,Amber' : 'nsec.app,njump.me',
              theme: 'default',
              darkMode: typeof window !== 'undefined' &&
                (localStorage.getItem('theme') === 'dark' ||
                 document.documentElement.classList.contains('dark')),
              perms: 'sign_event:1,sign_event:9,sign_event:55,nip04_encrypt,nip44_encrypt',
              noBanner: true,
              rememberMe: true,
            });
            console.log('✅ nostr-login initialized for authenticated user');
          } else {
            console.log('ℹ️ nostr-login already initialized, skipping');
          }
        } catch (error) {
          console.error('❌ Failed to initialize nostr-login:', error);
          if (error instanceof Error && error.message.includes('Already started')) {
            console.log('ℹ️ nostr-login was already started by another component');
          }
        }
      }
    };
    performCheckAuth();

    // Set up nostr-login event listener
    const handleAuth = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const authType = customEvent.detail.type;

      console.log('📡 nlAuth event in AuthProvider:', authType, customEvent.detail);

      if (authType === 'login' || authType === 'signup') {
        console.log('✅ User authenticated via nostr-login');

        if (typeof window !== 'undefined' && window.nostr) {
          try {
            const pubkey = await window.nostr.getPublicKey();
            console.log('🔑 Setting pubkey from nlAuth:', pubkey);
            setPubkey(pubkey);
          } catch (error) {
            console.error('❌ Failed to get pubkey after auth:', error);
          }
        }
      } else if (authType === 'logout') {
        console.log('🚪 User logged out via nostr-login');

        clearAuth();

        // Clear nostr-login data
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('nostr-login') || key.startsWith('nl-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => {
          console.log('🧹 Clearing nostr-login data:', key);
          localStorage.removeItem(key);
        });

        console.log('🔀 Redirecting to /');
        router.push('/');
      }
    };

    // Listen for nostr-login events using the correct event name
    document.addEventListener('nlAuth', handleAuth);

    return () => {
      document.removeEventListener('nlAuth', handleAuth);
    };
  }, [setPubkey, clearAuth, checkAuth, router]);

  return <>{children}</>;
}