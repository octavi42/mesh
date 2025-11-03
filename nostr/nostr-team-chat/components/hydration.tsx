'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-clean';

export default function Hydration() {
  useEffect(() => {
    console.log('🔄 HYDRATION: Starting manual store hydration');

    // Manually trigger hydration for persisted stores
    useAuthStore.persist.rehydrate();
    useWorkspaceStore.persist.rehydrate();

    console.log('✅ HYDRATION: Manual hydration triggered for all stores');
  }, []);

  return null;
}