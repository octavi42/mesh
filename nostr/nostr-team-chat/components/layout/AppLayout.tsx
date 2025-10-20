'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { IconBar } from './IconBar';
import { Sidebar } from './Sidebar';
import { AccountSheet } from '@/components/sheets/account-sheet';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]">
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-200 transition-all hover:bg-white hover:border-gray-300 dark:bg-gray-950/80 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-900 dark:hover:border-gray-700"
        style={{
          transform: sidebarOpen ? 'translateX(336px)' : 'translateX(0)',
          transition: 'transform 300ms ease-in-out',
        }}
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" x2="21" y1="6" y2="6" />
          <line x1="3" x2="21" y1="12" y2="12" />
          <line x1="3" x2="21" y1="18" y2="18" />
        </svg>
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
