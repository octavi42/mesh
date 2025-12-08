export interface Connection {
  id: string;
  serverId: string;
  serverName: string;
  status: 'connecting' | 'connected' | 'failed' | 'expired' | 'disconnected';
  authMethod: {
    type: 'oauth' | 'api_key' | 'none';
    setupUrl?: string;
    directUrl?: string;
    transport: string;
    cost: string;
  };
  auth?: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    expiresAt?: string;
    scopes?: string[];
  };
  userInfo?: {
    username?: string;
    email?: string;
    avatar?: string;
    workspaces?: string[];
  };
  connectedAt?: string;
  lastUsed?: string;
  error?: string;
}

export interface ConnectionsData {
  connections: Connection[];
  lastUpdated: string;
}

export interface OAuthState {
  serverId: string;
  serverName: string;
  authMethod: Connection['authMethod'];
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
  createdAt: string;
}