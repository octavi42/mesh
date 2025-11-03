'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAppInitialization } from '@/lib/hooks/use-app-initialization-clean';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading, hasHydrated } = useAuthStore();
  const { isInitialized, isInitializing, error } = useAppInitialization();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (hasHydrated && !loading && !isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to /');
      router.push('/');
    }
  }, [isAuthenticated, loading, hasHydrated, router]);

  // Show loading while checking auth or initializing
  if (!hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Show initialization state
  if (isInitializing) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Initializing...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Setting up your Nostr connection
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show initialization error
  if (error) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Initialization Failed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Render protected content
  return <AppLayout>{children}</AppLayout>;
}