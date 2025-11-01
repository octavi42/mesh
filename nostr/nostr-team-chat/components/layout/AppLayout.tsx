'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { IconBar } from './IconBar';
import { Sidebar } from './Sidebar';
import { AccountSheet } from '@/components/sheets/account-sheet';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { isAuthenticated, loading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isAuthenticated) {
      console.log('❌ AppLayout: Not authenticated, redirecting to /');
      router.push('/');
    }
  }, [mounted, loading, isAuthenticated, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  if (!mounted || (loading && !isAuthenticated)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]">
      <button
        onClick={toggleSidebar}
        className="fixed z-50 flex h-12 w-4 items-center justify-center text-gray-600 transition-all duration-300 ease-in-out hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 group bg-white dark:bg-black"
        style={{
          left: sidebarOpen ? '336px' : '12px',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'all 300ms ease-in-out',
        }}
        aria-label="Toggle sidebar"
      >
        <div className="relative w-4 h-4 flex items-center justify-center">
          <div className="relative w-3 h-3">
            <div
              className={`absolute w-0.5 h-1.5 bg-current transition-all duration-300 ease-in-out origin-bottom ${
                sidebarOpen
                  ? 'group-hover:rotate-45'
                  : 'group-hover:rotate-[-45deg]'
              }`}
              style={{
                top: '0px',
                left: '6px',
              }}
            />
            <div
              className={`absolute w-0.5 h-1.5 bg-current transition-all duration-300 ease-in-out origin-top ${
                sidebarOpen
                  ? 'group-hover:rotate-[-45deg]'
                  : 'group-hover:rotate-45'
              }`}
              style={{
                top: '6px',
                left: '6px',
              }}
            />
          </div>
        </div>
      </button>

      <div className="fixed right-4 top-4 z-50">
        <AccountSheet />
      </div>

      <Sidebar isOpen={sidebarOpen} />

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
