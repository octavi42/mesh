'use client';

import { ReactNode } from 'react';
import { NDKProvider } from '@/lib/providers/ndk-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { PostHogProvider } from '@/lib/providers/posthog-provider';

// Initialize console override for production (silences logs)
import '@/lib/utils/console-override';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider>
      <NDKProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </NDKProvider>
    </PostHogProvider>
  );
}
