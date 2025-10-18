import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { NostrAuth, SecureSessionManager } from '@/lib/auth/nostr-auth';

export function useSecureAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { isAuthenticated, pubkey, validateSession, logout } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!isAuthenticated) {
        setIsValidating(false);
        setIsValid(false);

        if (requireAuth) {
          router.push('/');
        }
        return;
      }

      const sessionValid = await validateSession();

      if (!sessionValid) {
        setIsValidating(false);
        setIsValid(false);

        if (requireAuth) {
          router.push('/');
        }
        return;
      }

      if (pubkey && window.nostr) {
        try {
          const currentPubkey = await window.nostr.getPublicKey();

          if (currentPubkey !== pubkey) {
            console.error('Pubkey mismatch! Logging out...');
            logout();
            setIsValidating(false);
            setIsValid(false);

            if (requireAuth) {
              router.push('/');
            }
            return;
          }

          setIsValid(true);
        } catch (error) {
          console.error('Failed to verify pubkey:', error);
          logout();
          setIsValid(false);

          if (requireAuth) {
            router.push('/');
          }
        }
      }

      setIsValidating(false);
    };

    validate();
  }, [isAuthenticated, pubkey, requireAuth, validateSession, logout, router]);

  return { isValidating, isValid, isAuthenticated, pubkey };
}

export function useAuthChallenge() {
  const [challenge, setChallenge] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateChallenge = () => {
    const { challenge: newChallenge } = NostrAuth.generateChallenge();
    setChallenge(newChallenge);
    return newChallenge;
  };

  const verifyChallenge = async (expectedChallenge: string, url?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const authEvent = await NostrAuth.createAuthEvent(expectedChallenge, url);

      if (!authEvent) {
        setError('Failed to create auth event');
        setIsLoading(false);
        return null;
      }

      const result = await NostrAuth.verifyAuthEvent(
        authEvent,
        expectedChallenge,
        url
      );

      if (!result.valid) {
        setError(result.error || 'Verification failed');
        setIsLoading(false);
        return null;
      }

      setIsLoading(false);
      return result.pubkey;
    } catch (err) {
      setError('Authentication failed');
      setIsLoading(false);
      return null;
    }
  };

  return {
    challenge,
    isLoading,
    error,
    generateChallenge,
    verifyChallenge,
  };
}
