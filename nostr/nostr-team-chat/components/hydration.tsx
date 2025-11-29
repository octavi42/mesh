'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';
import { cleanupCorruptedWorkspaces, cleanupCorruptedChatStore } from '@/lib/utils/localStorage-cleanup';

export default function Hydration() {
  useEffect(() => {
    console.log('🔄 HYDRATION: Starting cleanup and hydration');

    // First, clean up any corrupted localStorage data
    cleanupCorruptedWorkspaces();
    cleanupCorruptedChatStore();

    // Trigger hydration for persisted stores
    // This is needed in Next.js because SSR creates stores without localStorage access
    useAuthStore.persist.rehydrate();
    useWorkspaceStore.persist.rehydrate();

    console.log('✅ HYDRATION: Cleanup and hydration complete');
  }, []);

  return null;
}