'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useChatStore } from '@/lib/stores/chat-store';

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { setPubkey, clearAuth, checkAuth } = useAuthStore();
  const { initializeClient, clearAllData: clearWorkspaceData } = useWorkspaceStore();
  const { reset: resetChat } = useChatStore();

  useEffect(() => {
    console.log('🚀 Providers mounted - initializing nostr-login');

    const initNostrLogin = async () => {
      try {
        const { init } = await import('nostr-login');
        init({
          bunkers: 'nsec.app,njump.me',
          theme: 'default',
          darkMode: typeof window !== 'undefined' &&
            (localStorage.getItem('theme') === 'dark' ||
             document.documentElement.classList.contains('dark')),
          perms: 'sign_event:1,sign_event:55,nip04_encrypt,nip44_encrypt',
          noBanner: true,
        });
        console.log('✅ nostr-login initialized in Providers');
      } catch (error) {
        console.error('❌ Failed to initialize nostr-login:', error);
      }
    };

    initNostrLogin();

    const performCheckAuth = async () => {
      console.log('🔍 Providers: Initial checkAuth');
      await checkAuth();
    };
    performCheckAuth();

    const handleAuth = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const authType = customEvent.detail.type;

      console.log('📡 nlAuth event in Providers:', authType, customEvent.detail);

      if (authType === 'login' || authType === 'signup') {
        console.log('✅ User authenticated via nostr-login');

        if (typeof window !== 'undefined' && window.nostr) {
          try {
            const pubkey = await window.nostr.getPublicKey();
            console.log('🔑 Setting pubkey from nlAuth:', pubkey);
            setPubkey(pubkey);

            console.log('🔄 Initializing workspace client');
            await initializeClient();

            if (window.location.pathname === '/') {
              console.log('🔀 Redirecting to /app after login');
              router.push('/app');
            }
          } catch (error) {
            console.error('❌ Failed to get pubkey after auth:', error);
          }
        }
      } else if (authType === 'logout') {
        console.log('🚪 User logged out via nostr-login');

        clearAuth();

        await clearWorkspaceData();

        resetChat();

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

    document.addEventListener('nlAuth', handleAuth);

    return () => {
      document.removeEventListener('nlAuth', handleAuth);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
