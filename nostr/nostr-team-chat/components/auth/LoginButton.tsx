'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { nostrLoginState } from '@/lib/nostr-login-state';
import { LogIn, LogOut, ArrowRight } from 'lucide-react';

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className = '' }: LoginButtonProps) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthStore();
  const isInitializing = useRef(false);

  const handleLogin = async () => {
    console.log('🔘 Login button clicked');

    if (isInitializing.current) {
      console.log('⏳ Already initializing, please wait...');
      return;
    }

    try {
      isInitializing.current = true;

      if (!nostrLoginState.initialized) {
        console.log('🚀 Initializing nostr-login for the first time');
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
        console.log('✅ nostr-login initialized');

        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log('ℹ️ nostr-login already initialized, skipping init');
      }

      console.log('🚀 Launching nostr-login modal');
      const { launch } = await import('nostr-login');
      launch('welcome');
    } catch (error) {
      console.error('❌ Failed to launch nostr-login:', error);
      if (error instanceof Error && error.message.includes('Already started')) {
        console.log('ℹ️ nostr-login already started, just launching modal');
        try {
          const { launch } = await import('nostr-login');
          launch('welcome');
        } catch (launchError) {
          console.error('❌ Failed to launch modal:', launchError);
        }
      }
    } finally {
      isInitializing.current = false;
    }
  };

  const handleLogout = async () => {
    console.log('🚪 Logout button clicked');

    try {
      const nostrLogin = await import('nostr-login');
      if (nostrLogin.logout) {
        nostrLogin.logout();
      }
    } catch (error) {
      console.error('❌ Failed to logout:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-5 py-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse ${className}`}>
        <div className="w-4 h-4 bg-neutral-300 dark:bg-neutral-700 rounded" />
        <span className="text-neutral-400">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          onClick={() => router.push('/app')}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg font-medium transition-colors"
        >
          Enter App
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className={`flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg font-medium transition-colors ${className}`}
    >
      <LogIn className="w-4 h-4" />
      Connect with Nostr
    </button>
  );
}
