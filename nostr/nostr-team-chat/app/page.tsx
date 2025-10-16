'use client';

import { AppLayout } from '@/components/layout/AppLayout';

export default function HomePage() {
  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Welcome to Nostr Team Chat
          </h1>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Decentralized team collaboration powered by Nostr
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            Press <kbd className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">⌘B</kbd> to toggle sidebar
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
