import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthState,
  AuthStateData,
  AuthEvent,
  NostrSession,
  AuthMethod,
  NostrCapabilities,
  AuthError
} from './types';
import { AuthService } from './auth-service';
import { SessionManager } from './session-manager';
import { CapabilityDetector } from './capability-detector';

interface AuthStore extends AuthStateData {
  // Actions
  dispatch: (event: AuthEvent) => Promise<void>;

  // Getters
  isAuthenticated: () => boolean;
  isLoading: () => boolean;
  canRetry: () => boolean;
  getRecommendedMethod: () => AuthMethod | null;

  // Internal state management
  _hydrated: boolean;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      const authService = AuthService.getInstance();
      const sessionManager = SessionManager.getInstance();
      const capabilityDetector = CapabilityDetector.getInstance();

      return {
        // Initial state
        state: 'initial',
        session: null,
        capabilities: null,
        error: null,
        isLoading: false,
        _hydrated: false,

        // Actions
        dispatch: async (event: AuthEvent) => {
          const currentState = get();
          console.log('🎯 Auth dispatch:', event.type, 'from state:', currentState.state);

          try {
            switch (event.type) {
              case 'CHECK_CAPABILITIES':
                await handleCheckCapabilities();
                break;

              case 'CHECK_SESSION':
                await handleCheckSession();
                break;

              case 'LOGIN':
                await handleLogin(event.method);
                break;

              case 'LOGIN_SUCCESS':
                handleLoginSuccess(event.session);
                break;

              case 'LOGIN_ERROR':
                handleLoginError(event.error);
                break;

              case 'LOGOUT':
                handleLogout();
                break;

              case 'REFRESH_SESSION':
                await handleRefreshSession();
                break;

              case 'REFRESH_SUCCESS':
                handleRefreshSuccess(event.session);
                break;

              case 'REFRESH_ERROR':
                handleRefreshError(event.error);
                break;

              case 'SESSION_INVALID':
                handleSessionInvalid();
                break;

              default:
                console.warn('Unknown auth event:', event);
            }
          } catch (error) {
            console.error('Auth dispatch error:', error);
            set({
              state: 'error',
              error: {
                code: 'DISPATCH_ERROR',
                message: 'Internal authentication error',
                recoverable: true,
                retryable: true,
              },
              isLoading: false,
            });
          }
        },

        // Getters
        isAuthenticated: () => {
          const state = get();
          return state.state === 'authenticated' && state.session !== null;
        },

        isLoading: () => {
          const state = get();
          return state.isLoading || ['checking-capabilities', 'checking-session', 'authenticating', 'refreshing'].includes(state.state);
        },

        canRetry: () => {
          const state = get();
          return state.error?.retryable === true;
        },

        getRecommendedMethod: () => {
          const state = get();
          if (!state.capabilities) return null;
          return capabilityDetector.getRecommendedMethod(state.capabilities);
        },

        // Internal
        _setHydrated: () => set({ _hydrated: true }),

        // Event handlers
      };

      // Event handler implementations
      async function handleCheckCapabilities() {
        if (!isValidTransition(get().state, 'checking-capabilities')) return;

        set({ state: 'checking-capabilities', isLoading: true });

        try {
          const capabilities = await capabilityDetector.detectCapabilities();
          set({
            capabilities,
            state: 'checking-session',
          });

          // Auto-proceed to check session
          get().dispatch({ type: 'CHECK_SESSION' });
        } catch (error) {
          console.error('Capability detection failed:', error);
          set({
            state: 'error',
            error: {
              code: 'CAPABILITY_ERROR',
              message: 'Failed to detect authentication capabilities',
              recoverable: true,
              retryable: true,
            },
            isLoading: false,
          });
        }
      }

      async function handleCheckSession() {
        if (!isValidTransition(get().state, 'checking-session')) return;

        set({ state: 'checking-session', isLoading: true });

        const currentState = get();

        if (!currentState.session) {
          // No stored session
          set({
            state: 'unauthenticated',
            isLoading: false,
          });
          return;
        }

        // Validate stored session
        const isValid = await sessionManager.validateSession(currentState.session);

        if (isValid) {
          set({
            state: 'authenticated',
            isLoading: false,
          });

          // Start session monitoring
          sessionManager.startSessionMonitoring(
            currentState.session,
            () => get().dispatch({ type: 'SESSION_INVALID' })
          );
        } else {
          // Invalid session, clear it
          set({
            session: null,
            state: 'unauthenticated',
            isLoading: false,
          });
        }
      }

      async function handleLogin(method: AuthMethod) {
        if (!isValidTransition(get().state, 'authenticating')) return;

        set({
          state: 'authenticating',
          isLoading: true,
          error: null,
        });

        let result;
        switch (method) {
          case 'extension':
            result = await authService.authenticateWithExtension();
            break;
          case 'local':
            // This would need additional parameters (nsec)
            result = { success: false, error: { code: 'MISSING_PARAMS', message: 'Missing nsec parameter', recoverable: true, retryable: false } };
            break;
          case 'remote':
            result = await authService.authenticateWithRemote('');
            break;
          case 'mobile':
            result = await authService.authenticateWithMobile();
            break;
          default:
            result = { success: false, error: { code: 'UNKNOWN_METHOD', message: 'Unknown auth method', recoverable: false, retryable: false } };
        }

        if (result.success && result.session) {
          get().dispatch({ type: 'LOGIN_SUCCESS', session: result.session });
        } else if (result.error) {
          get().dispatch({ type: 'LOGIN_ERROR', error: result.error });
        }
      }

      function handleLoginSuccess(session: NostrSession) {
        set({
          session,
          state: 'authenticated',
          isLoading: false,
          error: null,
        });

        // Start session monitoring
        sessionManager.startSessionMonitoring(
          session,
          () => get().dispatch({ type: 'SESSION_INVALID' })
        );

        console.log('✅ Authentication successful for:', session.pubkey);
      }

      function handleLoginError(error: AuthError) {
        set({
          state: 'error',
          error,
          isLoading: false,
        });

        console.error('❌ Authentication failed:', error);
      }

      function handleLogout() {
        const currentState = get();

        // Stop session monitoring
        sessionManager.stopSessionMonitoring();

        set({
          session: null,
          state: 'unauthenticated',
          error: null,
          isLoading: false,
        });

        console.log('🚪 Logged out');
      }

      async function handleRefreshSession() {
        const currentState = get();
        if (!currentState.session) return;

        if (!isValidTransition(currentState.state, 'refreshing')) return;

        set({ state: 'refreshing', isLoading: true });

        const result = await sessionManager.refreshSession(currentState.session);

        if (result.success && result.session) {
          get().dispatch({ type: 'REFRESH_SUCCESS', session: result.session });
        } else if (result.error) {
          get().dispatch({ type: 'REFRESH_ERROR', error: result.error });
        }
      }

      function handleRefreshSuccess(session: NostrSession) {
        set({
          session,
          state: 'authenticated',
          isLoading: false,
          error: null,
        });
      }

      function handleRefreshError(error: AuthError) {
        set({
          state: 'error',
          error,
          isLoading: false,
        });
      }

      function handleSessionInvalid() {
        sessionManager.stopSessionMonitoring();

        set({
          session: null,
          state: 'unauthenticated',
          error: {
            code: 'SESSION_INVALID',
            message: 'Your session has expired. Please log in again.',
            recoverable: true,
            retryable: true,
          },
          isLoading: false,
        });
      }

      function isValidTransition(fromState: AuthState, toState: AuthState): boolean {
        const validTransitions: Record<AuthState, AuthState[]> = {
          'initial': ['checking-capabilities'],
          'checking-capabilities': ['checking-session', 'error'],
          'checking-session': ['authenticated', 'unauthenticated', 'error'],
          'unauthenticated': ['authenticating'],
          'authenticating': ['authenticated', 'error'],
          'authenticated': ['refreshing', 'unauthenticated'],
          'refreshing': ['authenticated', 'error'],
          'error': ['checking-capabilities', 'unauthenticated', 'authenticating'],
        };

        return validTransitions[fromState]?.includes(toState) ?? false;
      }
    },
    {
      name: 'auth-state',
      partialize: (state) => ({
        session: state.session,
        // Don't persist state, capabilities, or error - they should be recomputed
      }),
      onRehydrateStorage: () => {
        console.log('💧 Auth state: Starting hydration...');
        return (state, error) => {
          if (error) {
            console.error('❌ Auth state hydration error:', error);
          } else {
            console.log('✅ Auth state hydrated:', state?.session ? 'with session' : 'without session');
            if (state) {
              state._setHydrated();
              // Trigger capability check after hydration
              setTimeout(() => {
                state.dispatch({ type: 'CHECK_CAPABILITIES' });
              }, 100);
            }
          }
        };
      },
    }
  )
);