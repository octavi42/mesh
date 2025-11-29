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
            import('../hooks/use-nip29-workspaces').then(({ forceRefreshWorkspaces }) => {
              forceRefreshWorkspaces();
              console.log('🔄 Workspace session reset due to pubkey change');
            }).catch(error => {
              console.warn('Failed to reset workspace session:', error);
            });

            // Also refresh channels for the new account
            import('../hooks/use-channels').then(({ refreshAllChannelsForUser }) => {
              refreshAllChannelsForUser();
              console.log('🔄 Channel refresh triggered due to pubkey change');
            }).catch(error => {
              console.warn('Failed to refresh channels:', error);
            });
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

        // Reset workspace session on logout
        try {
          import('../hooks/use-nip29-workspaces').then(({ resetWorkspaceSession }) => {
            resetWorkspaceSession();
            console.log('🔄 Workspace session reset on logout');
          }).catch(error => {
            console.warn('Failed to reset workspace session:', error);
          });
        } catch (error) {
          console.warn('Failed to reset workspace session:', error);
        }

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
        return (state, error) => {
          // Check if already hydrated to prevent double hydration
          const currentState = useAuthStore.getState();
          if (currentState.hasHydrated) {
            console.log('⏭️ Auth store: Already hydrated, skipping');
            return;
          }
          
          if (error) {
            console.error('❌ Auth store hydration error:', error);
            useAuthStore.setState({ hasHydrated: true, loading: false });
            return;
          }
          
          // Get state after hydration - Zustand has already merged persisted data
          const hydratedState = useAuthStore.getState();
          console.log('✅ Auth store hydrated, current state:', {
            pubkey: hydratedState.pubkey?.slice(0, 8),
            isAuthenticated: hydratedState.isAuthenticated
          });
          
          // Set hasHydrated and loading
          useAuthStore.setState({ 
            hasHydrated: true, 
            loading: false 
          });
          
          // If we have auth, optionally verify in background (non-blocking)
          if (hydratedState.pubkey && hydratedState.isAuthenticated) {
            console.log('✅ Found persisted auth:', hydratedState.pubkey.slice(0, 8));
            if (typeof window !== 'undefined' && window.nostr) {
              window.nostr.getPublicKey().then((pubkey: string) => {
                if (pubkey !== hydratedState.pubkey) {
                  console.warn('⚠️ Persisted pubkey mismatch, clearing auth');
                  useAuthStore.getState().clearAuth();
                } else {
                  console.log('✅ Persisted auth verified in background');
                }
              }).catch(() => {
                console.log('ℹ️ Could not verify auth in background, keeping persisted state');
              });
            }
          } else {
            console.log('ℹ️ No persisted auth found');
          }
          
          console.log('🏁 Auth store: hydration complete');
        };
      },
    }
  )
);
