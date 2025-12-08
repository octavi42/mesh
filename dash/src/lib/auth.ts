export interface AuthConfig {
  id: string;
  toolkit: string;
  authScheme: string;
  config: Record<string, any>;
  status: 'active' | 'inactive';
}

export interface ConnectionRequest {
  user_id: string;
  auth_config_id: string;
  config?: {
    auth_scheme: string;
  };
  callback_url?: string;
  labels?: string[];
}

export interface ConnectionResponse {
  id: string;
  redirect_url: string;
  status: 'initiated' | 'pending' | 'active' | 'error';
}

export interface ConnectedAccount {
  id: string;
  integrationId: string;
  entityId: string;
  status: 'active' | 'inactive' | 'error';
  connectionParams?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  authConfigId?: string; // Added for tool execution
}

const API_BASE_URL = '/api/composio';

export class ComposioAuthService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = API_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }

  // Generate unique entity ID for user
  generateEntityId(userId?: string): string {
    return userId || `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  // Get callback URL for current domain
  getCallbackUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/auth/callback`;
    }
    return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/auth/callback`;
  }

  // Create auth config automatically using Composio managed auth
  async createAuthConfig(toolkit: string): Promise<string> {
    try {
      const response = await this.request<{
        auth_config: {
          id: string;
          auth_scheme: string;
          is_composio_managed: boolean;
        };
      }>('/v3/auth_configs', {
        method: 'POST',
        body: JSON.stringify({
          toolkit: {
            slug: toolkit
          }
        }),
      });

      console.log(`✅ Created auth config for ${toolkit}:`, response.auth_config.id);
      return response.auth_config.id;
    } catch (error) {
      console.error(`❌ Failed to create auth config for ${toolkit}:`, error);
      throw new Error(`Cannot create auth config for ${toolkit}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cache auth config IDs to avoid recreating them
  private authConfigCache: Record<string, string> = {};
  
  async getOrCreateAuthConfigId(toolkit: string): Promise<string> {
    // Check cache first
    if (this.authConfigCache[toolkit]) {
      console.log(`📝 Using cached auth config for ${toolkit}:`, this.authConfigCache[toolkit]);
      return this.authConfigCache[toolkit];
    }

    // Create new auth config automatically
    const authConfigId = await this.createAuthConfig(toolkit);
    
    // Cache for future use
    this.authConfigCache[toolkit] = authConfigId;
    
    return authConfigId;
  }

  // Initiate OAuth connection using v3 API
  async initiateConnection(toolkit: string, userId: string): Promise<ConnectionResponse> {
    const authConfigId = await this.getOrCreateAuthConfigId(toolkit);
    
    try {
      // Use v3 API for connection initiation with correct payload format
      const payload = {
        entity_id: userId,
        integration: toolkit,
        auth_config: {
          id: authConfigId
        },
        connection: {
          redirect_url: this.getCallbackUrl()
        }
      };

      const response = await this.request<any>('/v3/connected_accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log(`✅ v3 connection response:`, response);
      
      // Return the OAuth URL from the response
      return {
        id: response.id || response.connection_id || `conn_${Date.now()}`,
        redirect_url: response.redirect_url || response.auth_url || response.connection?.auth_url,
        status: response.status || 'initiated'
      };
      
    } catch (error) {
      console.error(`❌ v3 connection failed for ${toolkit}:`, error);
      throw new Error(`Cannot initiate connection for ${toolkit}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get connected accounts using v3 API
  async getConnectedAccounts(userId?: string): Promise<{ items: ConnectedAccount[] }> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('entity_id', userId); // v3 uses entity_id instead of user_id
    }
    
    const endpoint = `/v3/connected_accounts${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<{ items: ConnectedAccount[] }>(endpoint);
  }

  // Check connection status using v3 API
  async getConnectionStatus(connectionId: string): Promise<ConnectedAccount> {
    return this.request<ConnectedAccount>(`/v3/connected_accounts/${connectionId}`);
  }

  // Delete connection using v3 API
  async deleteConnection(connectionId: string): Promise<void> {
    await this.request(`/v3/connected_accounts/${connectionId}`, {
      method: 'DELETE',
    });
  }

  // Refresh connection using v3 API
  async refreshConnection(connectionId: string): Promise<ConnectedAccount> {
    return this.request<ConnectedAccount>(`/v3/connected_accounts/${connectionId}/refresh`, {
      method: 'POST',
    });
  }

  // Wait for connection to be active (polling)
  async waitForConnection(connectionId: string, maxAttempts = 30, interval = 2000): Promise<ConnectedAccount> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const account = await this.getConnectionStatus(connectionId);
        const status = account.status?.toLowerCase();
        
        if (status === 'active') {
          return account;
        }
        if (status === 'error' || status === 'failed') {
          throw new Error('Connection failed');
        }
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Connection timeout');
  }

  // Open OAuth popup
  openOAuthPopup(url: string, width = 500, height = 600): Window | null {
    if (typeof window === 'undefined') return null;

    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    return window.open(
      url,
      'oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars,status`
    );
  }

  // Handle OAuth flow with popup
  async connectWithOAuth(
    toolkit: string, 
    userId: string,
    options: { usePopup?: boolean; onProgress?: (status: string) => void } = {}
  ): Promise<ConnectedAccount> {
    const { usePopup = true, onProgress } = options;

    onProgress?.('Initiating connection...');

    // Initiate connection
    const connection = await this.initiateConnection(toolkit, userId);

    if (usePopup) {
      // Open OAuth popup
      const popup = this.openOAuthPopup(connection.redirect_url);
      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please allow popups for this site.');
      }

      onProgress?.('Waiting for authorization...');

      // Use message-based detection instead of popup.closed
      return new Promise<ConnectedAccount>((resolve, reject) => {
        let resolved = false;

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'oauth_callback') {
            if (resolved) return;
            resolved = true;
            
            window.removeEventListener('message', handleMessage);
            
            if (event.data.success) {
              onProgress?.('Verifying connection...');
              
              // Wait for connection to become active
              this.waitForConnection(connection.id)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error(event.data.error || 'OAuth failed'));
            }
          }
        };

        // Listen for callback messages
        window.addEventListener('message', handleMessage);

        // Fallback: Poll connection status without checking popup.closed
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes with 5-second intervals
        
        const pollConnection = async () => {
          if (resolved) return;
          
          attempts++;
          
          try {
            console.log(`🔍 Checking connection status (attempt ${attempts}):`, connection.id);
            const account = await this.getConnectionStatus(connection.id);
            console.log(`📊 Connection status:`, account);
            
            // Check for both uppercase and lowercase status values
            const status = account.status?.toLowerCase();
            
            if (status === 'active') {
              console.log(`✅ Connection became active:`, account);
              if (!resolved) {
                resolved = true;
                window.removeEventListener('message', handleMessage);
                resolve(account);
              }
              return;
            }
            
            if (status === 'error' || status === 'failed') {
              console.log(`❌ Connection failed:`, account);
              if (!resolved) {
                resolved = true;
                window.removeEventListener('message', handleMessage);
                reject(new Error('Connection failed'));
              }
              return;
            }

            console.log(`⏳ Connection still ${account.status}, continuing to poll...`);
          } catch (error) {
            console.log(`❌ Connection check attempt ${attempts} failed:`, error);
          }

          // Continue polling if not resolved
          if (attempts < maxAttempts && !resolved) {
            setTimeout(pollConnection, 5000);
          } else if (!resolved) {
            console.log(`⏰ OAuth timeout after ${attempts} attempts`);
            resolved = true;
            window.removeEventListener('message', handleMessage);
            reject(new Error('OAuth timeout'));
          }
        };

        // Start polling after a short delay
        setTimeout(pollConnection, 3000);

        // Overall timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            window.removeEventListener('message', handleMessage);
            try {
              popup.close();
            } catch (e) {
              // Ignore popup close errors
            }
            reject(new Error('OAuth timeout'));
          }
        }, 300000); // 5 minutes
      });
    } else {
      // Redirect to OAuth page
      if (typeof window !== 'undefined') {
        window.location.href = connection.redirect_url;
      }
      throw new Error('Redirecting to OAuth page...');
    }
  }
}

// Global instance
let authService: ComposioAuthService | null = null;

export function getAuthService(apiKey: string): ComposioAuthService {
  if (!authService) {
    authService = new ComposioAuthService(apiKey);
  }
  return authService;
}

// Utility function to check if integration supports OAuth
export function supportsOAuth(authSchemes: string[]): boolean {
  return authSchemes.some(scheme => 
    scheme.toLowerCase().includes('oauth') || 
    scheme.toLowerCase().includes('oauth2')
  );
}