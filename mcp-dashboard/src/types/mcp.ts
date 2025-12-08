export interface MCPServer {
  name: string;
  url?: string;
  externalUrl?: string;
  description: string;
  sourceCodeUrl?: string;
  githubStars?: number;
  packageDownloads?: number;
  packageRegistry?: {
    type: string;
    url: string;
  };
  authMethods: Array<{
    type: 'oauth' | 'api_key' | 'none';
    setupUrl?: string;
    directUrl?: string;
    transport: string;
    cost: string;
  }>;
}

export interface PulseMCPResponse {
  servers: MCPServer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}