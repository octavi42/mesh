'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginSheet } from '@/components/sheets/login-sheet';
import { useAuthStore } from '@/lib/stores/auth-store';
import { BackgroundPaths } from '@/components/ui/background-paths';

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


  const handleLoginClick = async () => {
    console.log('🔘 Login button clicked');

    if (typeof window !== 'undefined') {
      // Check if user is already logged in
      const hasNostrData = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
        .some(key => key && (key.startsWith('nostr-login') || key.startsWith('nl-')));

      if (hasNostrData) {
        console.log('⚠️ Found existing nostr-login data - clearing and reloading for fresh start');
        // Clear stale data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('nostr-login') || key.startsWith('nl-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Reload for fresh initialization
        window.location.reload();
        return;
      }

      // No stale data, proceed with normal login
      console.log('✅ No stale data found, launching nostr-login modal');
      const { initNostrLogin } = await import('@/lib/nostr-login-init');
      await initNostrLogin();

      // Small delay to ensure nostr-login is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('🚀 Dispatching nlLaunch event');
      document.dispatchEvent(new CustomEvent('nlLaunch', { detail: 'welcome' }));
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <BackgroundPaths 
        title="Team chat that respects your freedom"
        header={
          <nav className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-white">Mash</span>
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
        }
      >
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
      </BackgroundPaths>

      <section className="py-20 px-6 bg-gray-50 dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-left">
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
      </section>
    </div>
  );
}
