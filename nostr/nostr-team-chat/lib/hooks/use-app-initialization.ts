import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth/auth-state-manager';
import { useWorkspaceStore } from '@/lib/stores/workspace-store-v2';
import { DataCoordinator } from '@/lib/coordination/data-coordinator';

interface AppInitializationState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  hasWorkspaces: boolean;
}

/**
 * Hook to handle app initialization after authentication
 * Orchestrates data loading across all stores using the DataCoordinator
 */
export function useAppInitialization(): AppInitializationState {
  const { session, isAuthenticated } = useAuthStore();
  const { workspaces, _hydrated: workspaceHydrated } = useWorkspaceStore();
  const [initState, setInitState] = useState<AppInitializationState>({
    isInitialized: false,
    isInitializing: false,
    error: null,
    hasWorkspaces: false,
  });

  useEffect(() => {
    // Only initialize if:
    // 1. User is authenticated
    // 2. We have a session
    // 3. Stores are hydrated
    // 4. Not already initialized or initializing
    if (!isAuthenticated || !session || !workspaceHydrated || initState.isInitialized || initState.isInitializing) {
      return;
    }

    console.log('🚀 useAppInitialization: Starting app initialization...');

    const initializeApp = async () => {
      setInitState(prev => ({ ...prev, isInitializing: true, error: null }));

      try {
        const coordinator = DataCoordinator.getInstance();
        const result = await coordinator.initializeUserData(session);

        if (result.errors.length > 0) {
          console.warn('⚠️ App initialization completed with errors:', result.errors);
          setInitState({
            isInitialized: true,
            isInitializing: false,
            error: result.errors[0], // Show first error
            hasWorkspaces: result.workspaces.length > 0,
          });
        } else {
          console.log('✅ App initialization completed successfully');
          setInitState({
            isInitialized: true,
            isInitializing: false,
            error: null,
            hasWorkspaces: result.workspaces.length > 0,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        console.error('❌ App initialization failed:', errorMessage);

        setInitState({
          isInitialized: false,
          isInitializing: false,
          error: errorMessage,
          hasWorkspaces: false,
        });
      }
    };

    initializeApp();
  }, [isAuthenticated, session, workspaceHydrated, initState.isInitialized, initState.isInitializing]);

  // Update hasWorkspaces when workspaces change
  useEffect(() => {
    if (initState.isInitialized) {
      setInitState(prev => ({
        ...prev,
        hasWorkspaces: workspaces.length > 0,
      }));
    }
  }, [workspaces.length, initState.isInitialized]);

  // Reset initialization state when user logs out
  useEffect(() => {
    if (!isAuthenticated && initState.isInitialized) {
      console.log('🔄 useAppInitialization: Resetting on logout');
      setInitState({
        isInitialized: false,
        isInitializing: false,
        error: null,
        hasWorkspaces: false,
      });

      // Clean up coordinator
      const coordinator = DataCoordinator.getInstance();
      coordinator.cleanup().catch(error => {
        console.error('❌ DataCoordinator cleanup error:', error);
      });
    }
  }, [isAuthenticated, initState.isInitialized]);

  return initState;
}