import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { NostrAuth, SecureSessionManager } from '@/lib/auth/nostr-auth';

export function useSecureAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { isAuthenticated, pubkey } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      console.log('⏳ Waiting for hydration...');
      return;
    }

    console.log('🔍 Auth check:', { isAuthenticated, pubkey, requireAuth });

    if (requireAuth && (!isAuthenticated || !pubkey)) {
      console.log('❌ Not authenticated - REDIRECTING TO /');

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return;
    }

    if (isAuthenticated && pubkey) {
      console.log('✅ Authenticated:', pubkey);
    }
  }, [isAuthenticated, pubkey, requireAuth, router, isHydrated]);

  const isValid = isAuthenticated && !!pubkey;

  return {
    isValidating: !isHydrated,
    isValid,
    isAuthenticated,
    pubkey
  };
}

export function useAuthChallenge() {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateChallenge = async () => {
    try {
      const response = await fetch('/api/auth/challenge', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate challenge');
      }

      const data = await response.json();
      setChallengeId(data.challengeId);
      setChallenge(data.challenge);

      return data;
    } catch (err) {
      console.error('Failed to generate challenge:', err);
      throw err;
    }
  };

  const verifyChallenge = async (challengeId: string, challenge: string, url?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const authEvent = await NostrAuth.createAuthEvent(challenge, url);

      if (!authEvent) {
        setError('Failed to create auth event');
        setIsLoading(false);
        return null;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId,
          signedEvent: authEvent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Verification failed');
        setIsLoading(false);
        return null;
      }

      const result = await response.json();
      setIsLoading(false);
      return result.pubkey;
    } catch (err) {
      setError('Authentication failed');
      setIsLoading(false);
      return null;
    }
  };

  return {
    challengeId,
    challenge,
    isLoading,
    error,
    generateChallenge,
    verifyChallenge,
  };
}
