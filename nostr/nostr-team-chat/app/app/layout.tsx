'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAppInitialization } from '@/lib/hooks/use-app-initialization-clean';
import { useNIP29Workspaces } from '@/lib/hooks/use-nip29-workspaces';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, hasHydrated, pubkey } = useAuthStore();
  const { isInitialized, isInitializing, error } = useAppInitialization();
  const [authVerificationComplete, setAuthVerificationComplete] = useState(false);

  // Initialize workspaces once per authenticated session - persists during navigation
  useNIP29Workspaces();

  // Debug auth state changes
  useEffect(() => {
    console.log('🔍 Layout auth state change:', {
      pathname,
      isAuthenticated,
      loading,
      hasHydrated,
      hasPubkey: !!pubkey,
      pubkey: pubkey?.slice(0, 8),
      authVerificationComplete,
      timestamp: new Date().toISOString()
    });
  }, [pathname, isAuthenticated, loading, hasHydrated, pubkey, authVerificationComplete]);

  // Add a delay to allow auth verification to complete after hydration
  useEffect(() => {
    if (hasHydrated) {
      const timer = setTimeout(() => {
        console.log('🕐 Auth verification grace period complete');
        setAuthVerificationComplete(true);
      }, 1500); // Give 1.5 seconds for auth verification

      return () => clearTimeout(timer);
    } else {
      setAuthVerificationComplete(false);
    }
  }, [hasHydrated]);

  // Add global error handling to prevent HMR ping errors from causing page refreshes
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress HMR ping errors and other non-critical errors
      const errorMessage = event.reason?.message || event.reason?.toString() || '';
      if (errorMessage.includes('unrecognized HMR message') ||
          errorMessage.includes('ping') ||
          errorMessage.includes('HMR') ||
          errorMessage.includes('Relay') && errorMessage.includes('disconnected') ||
          errorMessage.includes('WebSocket') ||
          errorMessage.includes('auth-required')) {
        console.debug('🔧 Suppressed non-critical error:', errorMessage);
        event.preventDefault(); // Prevent the error from bubbling up
        return;
      }

      // Let other errors through for debugging
      console.warn('⚠️ Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Redirect to home if not authenticated (only for protected routes, after grace period)
  useEffect(() => {
    // Only redirect if we're on a protected route AND definitely not authenticated AND auth verification is complete
    const isProtectedRoute = pathname.startsWith('/app');

    if (hasHydrated && !loading && !isAuthenticated && isProtectedRoute && authVerificationComplete) {
      console.log('❌ Not authenticated on protected route after verification, redirecting to /', {
        pathname,
        hasHydrated,
        loading,
        isAuthenticated,
        authVerificationComplete
      });
      router.push('/');
    } else if (hasHydrated && !loading && !isAuthenticated && isProtectedRoute && !authVerificationComplete) {
      console.log('⏳ Waiting for auth verification before redirect decision', {
        pathname,
        hasHydrated,
        loading,
        isAuthenticated,
        authVerificationComplete
      });
    } else if (hasHydrated && !loading && !isAuthenticated && !isProtectedRoute) {
      console.log('ℹ️ Not authenticated but on public route, no redirect needed', {
        pathname
      });
    }
  }, [isAuthenticated, loading, hasHydrated, router, pathname, authVerificationComplete]);

  // Show loading while checking auth or initializing or during auth verification grace period
  if (!hasHydrated || loading || (hasHydrated && !authVerificationComplete && pathname.startsWith('/app'))) {
    console.log('🔄 Showing loading screen:', {
      hasHydrated,
      loading,
      authVerificationComplete,
      pathname,
      isAuthenticated,
      reason: !hasHydrated ? 'not hydrated' : loading ? 'loading' : 'auth verification grace period'
    });

    let loadingMessage = 'Loading...';
    if (!hasHydrated) {
      loadingMessage = 'Loading user data...';
    } else if (loading) {
      loadingMessage = 'Verifying authentication...';
    } else if (!authVerificationComplete) {
      loadingMessage = 'Checking authentication...';
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {loadingMessage}
          </p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Check if this is the main /app page (workspace selection)
  const isMainAppPage = pathname === '/app';

  // Render protected content
  if (isMainAppPage) {
    // For /app page, render without AppLayout to show custom workspace selection
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}