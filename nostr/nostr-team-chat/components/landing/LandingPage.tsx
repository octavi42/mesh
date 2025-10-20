'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginSheet } from '@/components/sheets/login-sheet';
import { useAuthStore } from '@/lib/stores/auth-store';

export function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleEnterApp = () => {
    router.push('/app');
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        if (typeof window !== 'undefined' && window.nostr) {
          await window.nostr.getPublicKey();
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    }

    if (isHydrated) {
      checkAuth();
    }
  }, [isHydrated]);

  useEffect(() => {
    import('@/lib/nostr-login-init')
      .then(({ initNostrLogin }) => initNostrLogin())
      .catch((error) => console.error('Failed to load nostr-login', error));

    const handleAuth = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const authType = customEvent.detail.type;

      console.log('📡 nlAuth event:', authType, customEvent.detail);

      if (authType === 'login' || authType === 'signup') {
        console.log('✅ User logged in via nostr-login');
        setIsAuthenticated(true);
        router.push('/app');
      } else if (authType === 'logout') {
        console.log('🚪 User logged out via nostr-login');
        setIsAuthenticated(false);
        router.push('/');
      }
    };

    document.addEventListener('nlAuth', handleAuth);

    return () => {
      document.removeEventListener('nlAuth', handleAuth);
    };
  }, [router]);

  const handleLoginClick = () => {
    if (typeof window !== 'undefined') {
      document.dispatchEvent(new CustomEvent('nlLaunch', { detail: 'welcome' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">Nostr Team Chat</span>
          </div>

          {!isHydrated ? (
            <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : isAuthenticated ? (
            <button
              onClick={handleEnterApp}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Enter App
            </button>
          ) : (
            <LoginSheet onLoginClick={handleLoginClick} />
          )}
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Decentralized team collaboration powered by Nostr
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Team chat that
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              respects your freedom
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            No servers to trust. No company that owns your data. Just you, your team, and the open Nostr protocol.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!isHydrated ? (
              <div className="w-48 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ) : isAuthenticated ? (
              <button
                onClick={handleEnterApp}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
              >
                Enter App
              </button>
            ) : (
              <LoginSheet
                onLoginClick={handleLoginClick}
                trigger={
                  <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl">
                    Get Started Free
                  </button>
                }
              />
            )}
            <button className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-colors border border-gray-200 dark:border-gray-700">
              Learn More
            </button>
          </div>

          <div className="mt-20 grid md:grid-cols-3 gap-8 text-left">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Privacy First</h3>
              <p className="text-gray-600 dark:text-gray-400">
                End-to-end encrypted conversations. Your keys, your data. No backdoors.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time messaging over the Nostr network. No lag, no waiting.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Truly Open</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Built on open protocols. No vendor lock-in. Export your data anytime.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
