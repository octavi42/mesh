'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAuthService, ComposioAuthService, ConnectedAccount } from '@/lib/auth';
import { ComposioToolkit } from '@/lib/composio';

interface ConnectionState {
  // Connected accounts by integration ID
  connections: Record<string, ConnectedAccount>;
  // Loading states by integration ID
  loadingStates: Record<string, boolean>;
  // Connection progress messages
  progressMessages: Record<string, string>;
  // User entity ID
  entityId: string;
}

interface ConnectionContextType extends ConnectionState {
  // Actions
  connectIntegration: (toolkit: ComposioToolkit) => Promise<void>;
  disconnectIntegration: (integrationId: string) => Promise<void>;
  refreshConnection: (connectionId: string) => Promise<void>;
  checkConnectionStatus: (integrationId: string) => Promise<void>;
  isConnected: (integrationId: string) => boolean;
  isLoading: (integrationId: string) => boolean;
  getProgressMessage: (integrationId: string) => string;
  // Service
  authService: ComposioAuthService;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: React.ReactNode;
  apiKey: string;
}

export function ConnectionProvider({ children, apiKey }: ConnectionProviderProps) {
  const [state, setState] = useState<ConnectionState>({
    connections: {},
    loadingStates: {},
    progressMessages: {},
    entityId: '',
  });

  const authService = getAuthService(apiKey);

  // Initialize entity ID
  useEffect(() => {
    const getOrCreateEntityId = () => {
      // Try to get from localStorage first
      const stored = localStorage.getItem('composio_entity_id');
      if (stored) {
        return stored;
      }
      
      // Generate new entity ID
      const newEntityId = authService.generateEntityId();
      localStorage.setItem('composio_entity_id', newEntityId);
      return newEntityId;
    };

    const entityId = getOrCreateEntityId();
    setState(prev => ({ ...prev, entityId }));
  }, [authService]);

  // Save connections to localStorage
  const saveConnectionsToStorage = useCallback((connections: Record<string, ConnectedAccount>) => {
    try {
      const storageKey = `composio_connections_${state.entityId}`;
      localStorage.setItem(storageKey, JSON.stringify(connections));
      console.log('💾 Saved connections to localStorage:', Object.keys(connections));
    } catch (error) {
      console.error('Failed to save connections to localStorage:', error);
    }
  }, [state.entityId]);

  // Load connections from Composio API
  const loadConnectionsFromAPI = useCallback(async () => {
    try {
      const { items } = await authService.getConnectedAccounts(state.entityId);
      const connectionsMap = items.reduce((acc, account) => {
        acc[account.integrationId] = account;
        return acc;
      }, {} as Record<string, ConnectedAccount>);

      setState(prev => ({
        ...prev,
        connections: connectionsMap,
      }));
      
      // Save to localStorage for future use
      saveConnectionsToStorage(connectionsMap);
    } catch (error) {
      console.error('Failed to load connections from API:', error);
    }
  }, [authService, state.entityId, saveConnectionsToStorage]);

  // Verify stored connections are still active
  const verifyStoredConnections = useCallback(async (storedConnections: Record<string, ConnectedAccount>) => {
    const activeConnections: Record<string, ConnectedAccount> = {};
    let hasChanges = false;

    for (const [integrationId, connection] of Object.entries(storedConnections)) {
      try {
        // Check if connection is still active
        const currentStatus = await authService.getConnectionStatus(connection.id);
        if (currentStatus.status?.toLowerCase() === 'active') {
          activeConnections[integrationId] = {
            ...connection,
            ...currentStatus, // Update with latest data
          };
        } else {
          console.warn(`⚠️ Connection ${integrationId} is no longer active:`, currentStatus.status);
          hasChanges = true;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to verify connection ${integrationId}:`, error);
        hasChanges = true;
      }
    }

    // Update state and storage if there were changes
    if (hasChanges || Object.keys(activeConnections).length !== Object.keys(storedConnections).length) {
      setState(prev => ({
        ...prev,
        connections: activeConnections,
      }));
      saveConnectionsToStorage(activeConnections);
    }
  }, [authService, saveConnectionsToStorage]);

  // Load connections from localStorage
  const loadStoredConnections = useCallback(async () => {
    try {
      const storageKey = `composio_connections_${state.entityId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const storedConnections = JSON.parse(stored) as Record<string, ConnectedAccount>;
        console.log('📁 Loaded connections from localStorage:', Object.keys(storedConnections));
        
        setState(prev => ({
          ...prev,
          connections: storedConnections,
        }));
        
        // Verify connections are still active in background
        setTimeout(() => verifyStoredConnections(storedConnections), 1000);
      } else {
        // No stored connections, try loading from Composio API
        loadConnectionsFromAPI();
      }
    } catch (error) {
      console.error('Failed to load stored connections:', error);
      // Fallback to API if localStorage fails
      loadConnectionsFromAPI();
    }
  }, [state.entityId, verifyStoredConnections, loadConnectionsFromAPI]);

  // Load existing connections on mount - first try localStorage, then Composio API
  useEffect(() => {
    if (state.entityId) {
      loadStoredConnections();
    }
  }, [state.entityId, loadStoredConnections]);

  const setLoading = useCallback((integrationId: string, loading: boolean) => {
    setState(prev => ({
      ...prev,
      loadingStates: {
        ...prev.loadingStates,
        [integrationId]: loading,
      },
    }));
  }, []);

  const setProgressMessage = useCallback((integrationId: string, message: string) => {
    setState(prev => ({
      ...prev,
      progressMessages: {
        ...prev.progressMessages,
        [integrationId]: message,
      },
    }));
  }, []);

  const updateConnection = useCallback((integrationId: string, connection: ConnectedAccount) => {
    setState(prev => {
      const newConnections = {
        ...prev.connections,
        [integrationId]: connection,
      };
      
      // Save to localStorage
      saveConnectionsToStorage(newConnections);
      
      return {
        ...prev,
        connections: newConnections,
      };
    });
  }, [saveConnectionsToStorage]);

  const removeConnection = useCallback((integrationId: string) => {
    setState(prev => {
      const newConnections = { ...prev.connections };
      delete newConnections[integrationId];
      
      // Save to localStorage
      saveConnectionsToStorage(newConnections);
      
      return {
        ...prev,
        connections: newConnections,
      };
    });
  }, [saveConnectionsToStorage]);

  const connectIntegration = useCallback(async (toolkit: ComposioToolkit) => {
    if (!state.entityId) {
      throw new Error('Entity ID not initialized');
    }

    const integrationId = toolkit.slug;
    
    try {
      setLoading(integrationId, true);
      setProgressMessage(integrationId, 'Creating auth configuration...');

      // Get or create auth config first
      const authConfigId = await authService.getOrCreateAuthConfigId(integrationId);
      console.log(`🔐 Auth config ID for ${integrationId}:`, authConfigId);

      // Start OAuth flow - this now handles everything internally
      const connectedAccount = await authService.connectWithOAuth(
        integrationId,
        state.entityId,
        {
          usePopup: true,
          onProgress: (status) => setProgressMessage(integrationId, status),
        }
      );

      console.log(`✅ Connected account for ${integrationId}:`, connectedAccount);

      // Store the complete connection data including authConfigId
      const enhancedConnection = {
        ...connectedAccount,
        authConfigId, // Store auth config ID for tool usage
        integrationId,
        entityId: state.entityId,
      };

      updateConnection(integrationId, enhancedConnection);
      setProgressMessage(integrationId, 'Connected successfully!');
      setTimeout(() => setProgressMessage(integrationId, ''), 2000);

    } catch (error) {
      console.error('Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setProgressMessage(integrationId, errorMessage);
      setTimeout(() => setProgressMessage(integrationId, ''), 3000);
      throw error;
    } finally {
      setLoading(integrationId, false);
    }
  }, [state.entityId, authService, setLoading, setProgressMessage, updateConnection]);

  const disconnectIntegration = useCallback(async (integrationId: string) => {
    const connection = state.connections[integrationId];
    if (!connection) {
      throw new Error('Connection not found');
    }

    try {
      setLoading(integrationId, true);
      setProgressMessage(integrationId, 'Disconnecting...');

      await authService.deleteConnection(connection.id);
      removeConnection(integrationId);
      
      setProgressMessage(integrationId, 'Disconnected successfully!');
      setTimeout(() => setProgressMessage(integrationId, ''), 2000);
    } catch (error) {
      console.error('Disconnect failed:', error);
      setProgressMessage(integrationId, 'Disconnect failed');
      setTimeout(() => setProgressMessage(integrationId, ''), 3000);
      throw error;
    } finally {
      setLoading(integrationId, false);
    }
  }, [state.connections, authService, setLoading, setProgressMessage, removeConnection]);

  const refreshConnection = useCallback(async (connectionId: string) => {
    try {
      const connection = await authService.refreshConnection(connectionId);
      updateConnection(connection.integrationId, connection);
    } catch (error) {
      console.error('Refresh failed:', error);
      throw error;
    }
  }, [authService, updateConnection]);

  const checkConnectionStatus = useCallback(async (integrationId: string) => {
    const connection = state.connections[integrationId];
    if (!connection) return;

    try {
      const updatedConnection = await authService.getConnectionStatus(connection.id);
      updateConnection(integrationId, updatedConnection);
    } catch (error) {
      console.error('Status check failed:', error);
    }
  }, [state.connections, authService, updateConnection]);

  const isConnected = useCallback((integrationId: string) => {
    const connection = state.connections[integrationId];
    return connection?.status?.toLowerCase() === 'active';
  }, [state.connections]);

  const isLoading = useCallback((integrationId: string) => {
    return state.loadingStates[integrationId] || false;
  }, [state.loadingStates]);

  const getProgressMessage = useCallback((integrationId: string) => {
    return state.progressMessages[integrationId] || '';
  }, [state.progressMessages]);

  const contextValue: ConnectionContextType = {
    ...state,
    connectIntegration,
    disconnectIntegration,
    refreshConnection,
    checkConnectionStatus,
    isConnected,
    isLoading,
    getProgressMessage,
    authService,
  };

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextType {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}