'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { NewLandingPage } from '@/components/landing/NewLandingPage';

export default function HomePage() {
  const { loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-800 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <NewLandingPage />;
}
