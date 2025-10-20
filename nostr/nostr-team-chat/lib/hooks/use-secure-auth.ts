import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

interface UseSecureAuthOptions {
  redirectOnUnauth?: boolean;
}

export function useSecureAuth(options: UseSecureAuthOptions = {}) {
  const { redirectOnUnauth = true } = options;
  const router = useRouter();
  const { isAuthenticated, loading, pubkey } = useAuthStore();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (!hasCheckedAuth.current) {
      console.log('🔍 useSecureAuth: Initial auth check');
      hasCheckedAuth.current = true;
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (redirectOnUnauth && !isAuthenticated) {
      console.log('❌ useSecureAuth: Not authenticated, redirecting to /');
      router.push('/');
    }
  }, [isAuthenticated, redirectOnUnauth, router, loading]);

  return {
    isAuthenticated,
    pubkey,
    loading,
  };
}

