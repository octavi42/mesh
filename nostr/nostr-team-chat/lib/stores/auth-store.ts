import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SecureSessionManager } from '@/lib/auth/nostr-auth';

interface AuthState {
  isAuthenticated: boolean;
  pubkey: string | null;
  npub: string | null;
  challenge: string | null;
  login: (pubkey: string, challenge: string, npub?: string) => void;
  logout: () => void;
  validateSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      pubkey: null,
      npub: null,
      challenge: null,

      login: (pubkey, challenge, npub) => {
        SecureSessionManager.createSession(pubkey, challenge);

        set({
          isAuthenticated: true,
          pubkey,
          challenge,
          npub: npub || null,
        });
      },

      logout: () => {
        console.log('🔴 Logout called - clearing all auth state');
        SecureSessionManager.clearSession();

        set({
          isAuthenticated: false,
          pubkey: null,
          npub: null,
          challenge: null,
        });

        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          console.log('🔴 Cleared auth-storage from localStorage');
        }
      },

      validateSession: async () => {
        try {
          const response = await fetch('/api/auth/session');

          if (!response.ok) {
            get().logout();
            return false;
          }

          const data = await response.json();

          if (!data.authenticated) {
            get().logout();
            return false;
          }

          const state = get();
          if (state.pubkey && state.pubkey !== data.pubkey) {
            console.error('Pubkey mismatch between client and server');
            get().logout();
            return false;
          }

          return true;
        } catch (error) {
          console.error('Session validation failed:', error);
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
