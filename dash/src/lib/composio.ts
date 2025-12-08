export interface ComposioToolkit {
  slug: string;
  name: string;
  is_local_toolkit: boolean;
  deprecated?: { toolkitId: string };
  meta: {
    created_at: string;
    updated_at: string;
    description: string;
    logo: string;
    categories: Array<{
      id: string;
      name: string;
    }>;
    triggers_count: number;
    tools_count: number;
  };
  auth_schemes: string[];
  composio_managed_auth_schemes: string[];
  no_auth: boolean;
}

export interface ComposioResponse {
  items: ComposioToolkit[];
  total_pages: number;
  current_page: number;
  total_items: number;
  next_cursor?: string;
}

export interface ConnectedAccount {
  id: string;
  toolkit: string;
  status: 'active' | 'inactive' | 'error';
  connectionId: string;
  metadata?: Record<string, any>;
}

const API_BASE_URL = '/api/composio/v3';

export class ComposioAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Composio API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getToolkits(params?: {
    category?: string;
    managed_by?: 'composio' | 'all' | 'project';
    is_local?: boolean;
    sort_by?: 'usage' | 'alphabetically';
    limit?: number;
    cursor?: string;
  }): Promise<ComposioResponse> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/toolkits${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request<ComposioResponse>(endpoint);
  }

  async getConnectedAccounts(): Promise<{ items: ConnectedAccount[] }> {
    return this.request<{ items: ConnectedAccount[] }>('/connected-accounts');
  }

  async connectAccount(toolkitSlug: string): Promise<{ auth_url: string }> {
    return this.request<{ auth_url: string }>('/connected-accounts', {
      method: 'POST',
      body: JSON.stringify({ toolkit: toolkitSlug }),
    });
  }

  async disconnectAccount(connectionId: string): Promise<void> {
    await this.request(`/connected-accounts/${connectionId}`, {
      method: 'DELETE',
    });
  }
}