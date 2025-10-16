'use client';

import { useUIStore } from '@/lib/stores/ui-store';

export function IconBar() {
  const { toggleSidebar } = useUIStore();

  return (
    <div className="flex w-16 flex-col items-center gap-4 border-r border-gray-200 bg-white py-4 dark:border-gray-800 dark:bg-gray-950">
      <button
        onClick={toggleSidebar}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
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

      <div className="h-px w-10 bg-gray-200 dark:bg-gray-800" />

      <button
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        aria-label="Workspace"
      >
        W
      </button>
    </div>
  );
}
