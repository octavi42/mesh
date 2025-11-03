'use client';

import { ReactNode } from 'react';
import { NDKProvider } from '@/lib/providers/ndk-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NDKProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NDKProvider>
  );
}
