import { useEffect } from 'react';
import { useAuthStore } from './auth-state-manager';

/**
 * Hook to initialize the auth system
 * Should be used once at the app root level
 */
export function useAuthInit() {
  const { state, _hydrated, dispatch } = useAuthStore();

  useEffect(() => {
    // Only initialize after hydration is complete
    if (!_hydrated) return;

    // Only initialize from initial state
    if (state !== 'initial') return;

    console.log('🚀 Initializing auth system...');
    dispatch({ type: 'CHECK_CAPABILITIES' });
  }, [_hydrated, state, dispatch]);

  return {
    isInitialized: _hydrated && state !== 'initial',
    isReady: _hydrated,
  };
}