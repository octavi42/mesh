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

        const currentState = get();
        const pubkeyChanged = currentState.pubkey !== pubkey;

        set({
          pubkey,
          npub: npub || null,
          isAuthenticated: !!pubkey,
          loading: false,
        });

        // Reset workspace session on pubkey change and start invites
        if (pubkey && pubkeyChanged) {
          console.log('🔔 Pubkey changed, restarting invite subscription for user:', pubkey);

          // Force reset workspace session for fresh data fetch
          try {
            const { resetWorkspaceSession } = require('../hooks/use-nip29-workspaces');
            resetWorkspaceSession();
            console.log('🔄 Workspace session reset due to pubkey change');
          } catch (error) {
            console.warn('Failed to reset workspace session:', error);
          }

          stopListeningForInvites(); // Stop existing subscription
          startListeningForInvites(pubkey).catch(error => {
            console.error('Failed to start invite subscription:', error);
          });
        } else if (pubkey && !pubkeyChanged) {
          console.log('🔔 Pubkey unchanged, keeping existing subscription');
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
        const currentState = get();

        // Only set loading if not already being managed by hydration
        if (!currentState.loading) {
          set({ loading: true });
        }

        if (typeof window === 'undefined') {
          set({ loading: false });
          return;
        }

        const hasPersistedAuth = currentState.pubkey && currentState.isAuthenticated;

        if (hasPersistedAuth) {
          console.log('✅ Found persisted auth, keeping user logged in:', currentState.pubkey?.slice(0, 8));

          // For persisted auth, try to verify it's still valid
          if (window.nostr) {
            try {
              const pubkey = await window.nostr.getPublicKey();
              if (pubkey === currentState.pubkey) {
                console.log('✅ Persisted auth verified with window.nostr');
                set({ loading: false });
                return;
              } else {
                console.log('⚠️ Persisted pubkey mismatch, clearing auth');
                get().clearAuth();
                return;
              }
            } catch (error) {
              console.log('⚠️ Could not verify persisted auth with window.nostr:', error);
              // Keep the persisted auth but set loading false
              set({ loading: false });
              return;
            }
          } else {
            console.log('ℹ️ No window.nostr available, trusting persisted auth');
            set({ loading: false });
            return;
          }
        }

        if (window.nostr) {
          try {
            const pubkey = await window.nostr.getPublicKey();
            console.log('✅ Got pubkey from window.nostr:', pubkey?.slice(0, 8));
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

        // Stop any existing subscriptions before starting new ones
        stopListeningForInvites();

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
            if (state) {
              state.hasHydrated = true;
              state.loading = false;
            }
          } else {
            console.log('✅ Auth store hydrated with state:', state);
            if (state) {
              state.hasHydrated = true;
              console.log('🏁 Auth store: hasHydrated set to true');

              // If we have persisted auth, verify it's still valid
              if (state.pubkey && state.isAuthenticated) {
                console.log('🔍 Found persisted auth, will verify asynchronously...');

                // Use setTimeout to handle async verification without blocking hydration
                setTimeout(async () => {
                  try {
                    console.log('🔍 Starting async auth verification...');
                    await state.checkAuth();
                    console.log('✅ Async auth verification complete');
                  } catch (error) {
                    console.error('❌ Async auth verification failed:', error);
                    // Clear auth if verification fails
                    state.clearAuth();
                  }
                }, 0);
              } else {
                console.log('ℹ️ No persisted auth found, setting loading to false');
                state.loading = false;
              }
            }
          }
        };
      },
    }
  )
);
