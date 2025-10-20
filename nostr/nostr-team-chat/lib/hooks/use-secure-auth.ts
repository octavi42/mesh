import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useSecureAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      console.log('🔍 Checking auth...');

      // Wait for nostr-login to initialize
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds max

      while (attempts < maxAttempts) {
        if (typeof window !== 'undefined' && window.nostr) {
          try {
            const pk = await window.nostr.getPublicKey();
            console.log('✅ Got pubkey from window.nostr:', pk);
            setPubkey(pk);
            setLoading(false);
            return;
          } catch (error) {
            console.log('⚠️ window.nostr exists but getPublicKey failed:', error);
            setPubkey(null);
            setLoading(false);
            return;
          }
        }

        console.log(`⏳ Waiting for window.nostr... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      console.log('❌ window.nostr not available after waiting');
      setPubkey(null);
      setLoading(false);
    }

    checkAuth();
  }, []);

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !pubkey) {
      console.log('❌ Not authenticated, redirecting to /');
      router.push('/');
    }
  }, [pubkey, requireAuth, router, loading]);

  return {
    isAuthenticated: !!pubkey,
    pubkey,
    loading
  };
}

