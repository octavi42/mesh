'use client';

import { useEffect, useState, useLayoutEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useAppInitialization } from '@/lib/hooks/use-app-initialization-clean';
import { useNIP29Workspaces } from '@/lib/hooks/use-nip29-workspaces';
import { AppLayout } from '@/components/layout/AppLayout';

// Helper to get auth state directly from localStorage (synchronous, no race conditions)
function getAuthFromLocalStorage(): { isAuthenticated: boolean; pubkey: string | null } {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, pubkey: null };
  }
  
  try {
    const storedAuth = localStorage.getItem('nostr-auth');
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      if (parsed?.state?.isAuthenticated && parsed?.state?.pubkey) {
        return {
          isAuthenticated: true,
          pubkey: parsed.state.pubkey
        };
      }
    }
  } catch (e) {
    // Invalid JSON or other error
  }
  
  return { isAuthenticated: false, pubkey: null };
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated: storeIsAuthenticated, loading, hasHydrated, pubkey } = useAuthStore();
  const { isInitialized, isInitializing, error } = useAppInitialization();

  // Track if we're on client - use a ref to avoid re-render
  const [mounted, setMounted] = useState(false);
  
  // Check localStorage SYNCHRONOUSLY during render (not in effect)
  // This is the only reliable way to get the value before any effects run
  const localStorageAuth = typeof window !== 'undefined' 
    ? getAuthFromLocalStorage() 
    : { isAuthenticated: false, pubkey: null };
  
  // Log on every render to debug
  console.log('🔄 RENDER:', {
    mounted,
    pathname,
    storeIsAuthenticated,
    localStorageAuth: localStorageAuth.isAuthenticated,
    hasHydrated,
    loading
  });
  
  // Use useLayoutEffect to set mounted BEFORE paint
  useLayoutEffect(() => {
    console.log('📦 useLayoutEffect - setting mounted');
    setMounted(true);
  }, []);
  
  // User is authenticated if EITHER the store says so OR localStorage has valid auth
  const isAuthenticated = storeIsAuthenticated || localStorageAuth.isAuthenticated;

  // Initialize workspaces once per authenticated session - persists during navigation
  useNIP29Workspaces();

  // Debug auth state changes
  useEffect(() => {
    console.log('🔍 Layout auth state change:', {
      pathname,
      storeIsAuthenticated,
      localStorageAuth: localStorageAuth.isAuthenticated,
      isAuthenticated,
      loading,
      hasHydrated,
      hasPubkey: !!pubkey,
      pubkey: pubkey?.slice(0, 8),
      timestamp: new Date().toISOString()
    });
  }, [pathname, storeIsAuthenticated, isAuthenticated, loading, hasHydrated, pubkey, localStorageAuth.isAuthenticated]);

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

  // Redirect to home if not authenticated (only for protected routes)
  // isAuthenticated already includes localStorage check, so this is safe
  useEffect(() => {
    const isProtectedRoute = pathname.startsWith('/app');

    console.log('🔍 Redirect check:', {
      pathname,
      isProtectedRoute,
      mounted,
      hasHydrated,
      loading,
      storeIsAuthenticated,
      localStorageAuth: localStorageAuth.isAuthenticated,
      isAuthenticated,
      wouldRedirect: isProtectedRoute && mounted && hasHydrated && !loading && !isAuthenticated
    });

    // Only redirect if:
    // 1. We're on a protected route
    // 2. Component is mounted
    // 3. Store has finished hydrating
    // 4. Not currently loading
    // 5. Not authenticated (checked both store AND localStorage)
    if (isProtectedRoute && mounted && hasHydrated && !loading && !isAuthenticated) {
      console.log('❌ Not authenticated on protected route, redirecting to /', {
        pathname,
        hasHydrated,
        mounted,
        loading,
        storeIsAuthenticated,
        localStorageAuth: localStorageAuth.isAuthenticated
      });
      router.push('/');
    }
  }, [isAuthenticated, loading, hasHydrated, mounted, router, pathname, storeIsAuthenticated, localStorageAuth.isAuthenticated]);

  // Show loading while checking auth or initializing
  // Wait for mount AND store hydration
  if (!mounted || !hasHydrated || loading) {
    const loadingMessage = !mounted ? 'Loading...' : !hasHydrated ? 'Loading user data...' : 'Verifying authentication...';

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

  // Not authenticated - will redirect (handled by useEffect above)
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