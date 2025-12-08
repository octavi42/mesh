import { Connection, ConnectionsData, OAuthState } from '@/types/connections';
import { MCPServer } from '@/types/mcp';

// In a real app, this would be a proper backend API
// For demo purposes, we'll use localStorage with JSON file as fallback
const CONNECTIONS_KEY = 'mcp_connections';
const OAUTH_STATES_KEY = 'mcp_oauth_states';

// Load initial data from JSON file (fallback)
const loadInitialData = async (): Promise<ConnectionsData> => {
  try {
    const response = await fetch('/src/data/connections.json');
    return await response.json();
  } catch (error) {
    console.warn('Could not load connections.json, using empty data:', error);
    return {
      connections: [],
      lastUpdated: new Date().toISOString()
    };
  }
};

// Get connections data (localStorage first, then JSON fallback)
export const getConnectionsData = async (): Promise<ConnectionsData> => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(CONNECTIONS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Invalid stored connections data, loading from file:', error);
      }
    }
  }
  
  return await loadInitialData();
};

// Save connections data to localStorage
export const saveConnectionsData = (data: ConnectionsData): void => {
  if (typeof window !== 'undefined') {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(data, null, 2));
  }
};

// Get all connections
export const getConnections = async (): Promise<Connection[]> => {
  const data = await getConnectionsData();
  return data.connections;
};

// Get connection by server ID
export const getConnection = async (serverId: string): Promise<Connection | null> => {
  const connections = await getConnections();
  return connections.find(conn => conn.serverId === serverId) || null;
};

// Add or update a connection
export const saveConnection = async (connection: Connection): Promise<void> => {
  const data = await getConnectionsData();
  const existingIndex = data.connections.findIndex(conn => conn.id === connection.id);
  
  if (existingIndex >= 0) {
    data.connections[existingIndex] = connection;
  } else {
    data.connections.push(connection);
  }
  
  saveConnectionsData(data);
};

// Remove a connection
export const removeConnection = async (connectionId: string): Promise<void> => {
  const data = await getConnectionsData();
  data.connections = data.connections.filter(conn => conn.id !== connectionId);
  saveConnectionsData(data);
};

// Generate a unique connection ID
export const generateConnectionId = (serverName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const sanitized = serverName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${sanitized}-${timestamp}-${random}`;
};

// Generate OAuth state
export const generateOAuthState = (): string => {
  return Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
};

// OAuth state management
export const saveOAuthState = (state: OAuthState): void => {
  if (typeof window !== 'undefined') {
    const states = getOAuthStates();
    states[state.state] = state;
    localStorage.setItem(OAUTH_STATES_KEY, JSON.stringify(states));
    
    // Clean up old states (older than 10 minutes)
    setTimeout(() => cleanupOAuthStates(), 1000);
  }
};

export const getOAuthState = (stateId: string): OAuthState | null => {
  const states = getOAuthStates();
  return states[stateId] || null;
};

export const removeOAuthState = (stateId: string): void => {
  if (typeof window !== 'undefined') {
    const states = getOAuthStates();
    delete states[stateId];
    localStorage.setItem(OAUTH_STATES_KEY, JSON.stringify(states));
  }
};

const getOAuthStates = (): Record<string, OAuthState> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(OAUTH_STATES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const cleanupOAuthStates = (): void => {
  const states = getOAuthStates();
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  
  Object.keys(states).forEach(stateId => {
    const state = states[stateId];
    if (new Date(state.createdAt).getTime() < tenMinutesAgo) {
      delete states[stateId];
    }
  });
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(OAUTH_STATES_KEY, JSON.stringify(states));
  }
};

// Check if server is connected
export const isServerConnected = async (serverId: string): Promise<boolean> => {
  const connection = await getConnection(serverId);
  return connection?.status === 'connected';
};

// Get connection status for display
export const getConnectionStatus = async (serverId: string): Promise<Connection['status'] | null> => {
  const connection = await getConnection(serverId);
  return connection?.status || null;
};

// Mock OAuth flow - simulates the actual OAuth process
export const simulateOAuthFlow = async (
  server: MCPServer,
  authMethod: MCPServer['authMethods'][0]
): Promise<Connection> => {
  const connectionId = generateConnectionId(server.name);
  const state = generateOAuthState();
  
  // Save OAuth state
  const oauthState: OAuthState = {
    serverId: server.name,
    serverName: server.name,
    authMethod,
    state,
    redirectUri: `${window.location.origin}/oauth/callback`,
    createdAt: new Date().toISOString()
  };
  
  saveOAuthState(oauthState);
  
  // Simulate OAuth success with mock data
  const connection: Connection = {
    id: connectionId,
    serverId: server.name,
    serverName: server.name,
    status: 'connected',
    authMethod,
    auth: authMethod.type === 'oauth' ? {
      accessToken: `mock_${authMethod.type}_token_${Math.random().toString(36).substr(2, 9)}`,
      refreshToken: `mock_refresh_token_${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      scopes: getDefaultScopes(server.name)
    } : {
      apiKey: `mock_api_key_${Math.random().toString(36).substr(2, 16)}`
    },
    userInfo: generateMockUserInfo(server.name),
    connectedAt: new Date().toISOString(),
    lastUsed: new Date().toISOString()
  };
  
  await saveConnection(connection);
  removeOAuthState(state);
  
  return connection;
};

// Generate default scopes based on server type
const getDefaultScopes = (serverName: string): string[] => {
  const name = serverName.toLowerCase();
  
  if (name.includes('github')) return ['repo', 'user:email'];
  if (name.includes('slack')) return ['channels:read', 'chat:write', 'users:read'];
  if (name.includes('twitter') || name.includes('x')) return ['tweet.read', 'tweet.write', 'users.read'];
  if (name.includes('google')) return ['profile', 'email'];
  
  return ['read', 'write'];
};

// Generate mock user info based on server type
const generateMockUserInfo = (serverName: string) => {
  const name = serverName.toLowerCase();
  const randomId = Math.random().toString(36).substr(2, 6);
  
  if (name.includes('github')) {
    return {
      username: `dev_user_${randomId}`,
      email: `developer${randomId}@example.com`,
      avatar: `https://github.com/dev_user_${randomId}.avatar`
    };
  }
  
  if (name.includes('slack')) {
    return {
      username: `team_${randomId}`,
      email: `team${randomId}@company.com`,
      workspaces: [`Workspace ${randomId.toUpperCase()}`]
    };
  }
  
  if (name.includes('twitter')) {
    return {
      username: `@user_${randomId}`,
      email: `user${randomId}@example.com`
    };
  }
  
  return {
    username: `user_${randomId}`,
    email: `user${randomId}@example.com`
  };
};