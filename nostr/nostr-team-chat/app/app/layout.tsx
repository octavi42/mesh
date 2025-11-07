'use client';

import { useEffect } from 'react';
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
  const { isAuthenticated, loading, hasHydrated } = useAuthStore();
  const { isInitialized, isInitializing, error } = useAppInitialization();

  // Initialize workspaces once per authenticated session - persists during navigation
  useNIP29Workspaces();

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

  // Check if this is the main /app page (workspace selection)
  const isMainAppPage = pathname === '/app';

  // Render protected content
  if (isMainAppPage) {
    // For /app page, render without AppLayout to show custom workspace selection
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}