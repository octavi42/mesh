import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  pubkey: string | null;
  npub: string | null;
  login: (pubkey: string, npub?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      pubkey: null,
      npub: null,

      login: (pubkey: string, npub?: string) => {
        console.log('🔑 LOGIN CALLED:', { pubkey, npub });
        set({
          pubkey,
          npub: npub || null,
        });
        console.log('✅ LOGIN COMPLETE - Store state:', get());
        console.log('📦 localStorage after login:', localStorage.getItem('nostr-auth'));
      },

      logout: () => {
        console.log('🚪 LOGOUT CALLED');
        console.trace('Logout stack trace:');
        set({
          pubkey: null,
          npub: null,
        });
        console.log('✅ LOGOUT COMPLETE - Store state:', get());
      },
    }),
    {
      name: 'nostr-auth',
      onRehydrateStorage: () => {
        console.log('💧 Zustand starting to hydrate from localStorage...');
        console.log('📦 localStorage value:', localStorage.getItem('nostr-auth'));
        return (state, error) => {
          if (error) {
            console.error('❌ Hydration error:', error);
          } else {
            console.log('✅ Zustand hydrated with state:', state);
          }
        };
      },
    }
  )
);
