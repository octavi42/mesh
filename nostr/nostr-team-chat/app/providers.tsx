'use client';

import { ReactNode } from 'react';
import { NDKProvider } from '@/lib/providers/ndk-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { PostHogProvider } from '@/lib/providers/posthog-provider';
import { EnvCheck } from '@/components/env-check';

// Initialize console override for production (silences logs)
import '@/lib/utils/console-override';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <EnvCheck>
      <PostHogProvider>
        <NDKProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NDKProvider>
      </PostHogProvider>
    </EnvCheck>
  );
}
