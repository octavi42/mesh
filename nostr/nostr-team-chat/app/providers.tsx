'use client';

import { ReactNode } from 'react';
import { NDKProvider } from '@/lib/providers/ndk-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';

// Initialize console override for production (silences logs)
import '@/lib/utils/console-override';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NDKProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NDKProvider>
  );
}
