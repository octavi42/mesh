import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startListeningForInvites, stopListeningForInvites } from '@/lib/nostr/invite-subscription';

interface AuthState {
  pubkey: string | null;
  npub: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  hasHydrated: boolean;
  setPubkey: (pubkey: string, npub?: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  login: (pubkey: string, npub?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      pubkey: null,
      npub: null,
      isAuthenticated: false,
      loading: true,
      hasHydrated: false,

      setPubkey: (pubkey: string, npub?: string) => {
        console.log('🔑 setPubkey called:', { pubkey, npub });
        set({
          pubkey,
          npub: npub || null,
          isAuthenticated: !!pubkey,
          loading: false,
        });

        // Start listening for invites when user logs in
        if (pubkey) {
          console.log('🔔 Starting invite subscription for user:', pubkey);
          startListeningForInvites(pubkey).catch(error => {
            console.error('Failed to start invite subscription:', error);
          });
        }
      },

      clearAuth: () => {
        console.log('🧹 clearAuth called');

        // Stop listening for invites when user logs out
        stopListeningForInvites();

        set({
          pubkey: null,
          npub: null,
          isAuthenticated: false,
          loading: false,
        });
      },

      checkAuth: async () => {
        console.log('🔍 checkAuth called');
        set({ loading: true });

        if (typeof window === 'undefined') {
          set({ loading: false });
          return;
        }

        const currentState = get();
        const hasPersistedAuth = currentState.pubkey && currentState.isAuthenticated;

        if (hasPersistedAuth) {
          console.log('✅ Found persisted auth, keeping user logged in:', currentState.pubkey);
          set({ loading: false });
          return;
        }

        if (window.nostr) {
          try {
            const pubkey = await window.nostr.getPublicKey();
            console.log('✅ Got pubkey from window.nostr:', pubkey);
            get().setPubkey(pubkey);
            return;
          } catch (error) {
            console.log('⚠️ window.nostr exists but getPublicKey failed:', error);
            set({ loading: false });
            return;
          }
        }

        console.log('ℹ️ No persisted auth and window.nostr not available, user needs to login');
        set({ loading: false });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      login: (pubkey: string, npub?: string) => {
        console.log('🔑 LOGIN CALLED:', { pubkey, npub });
        set({
          pubkey,
          npub: npub || null,
          isAuthenticated: !!pubkey,
          loading: false,
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
          isAuthenticated: false,
          loading: false,
        });
        console.log('✅ LOGOUT COMPLETE - Store state:', get());
      },
    }),
    {
      name: 'nostr-auth',
      partialize: (state) => ({
        pubkey: state.pubkey,
        npub: state.npub,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        console.log('💧 Auth store: Starting hydration from localStorage...');
        console.log('📦 localStorage value:', localStorage.getItem('nostr-auth'));
        return (state, error) => {
          if (error) {
            console.error('❌ Auth store hydration error:', error);
          } else {
            console.log('✅ Auth store hydrated with state:', state);
            // Mark as hydrated after successful hydration
            if (state) {
              state.hasHydrated = true;
              console.log('🏁 Auth store: hasHydrated set to true');
            }
          }
        };
      },
    }
  )
);
