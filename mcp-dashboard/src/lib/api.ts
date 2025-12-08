import { PulseMCPResponse } from '@/types/mcp';

interface RawMCPServer {
  name: string;
  url?: string;
  external_url?: string;
  short_description?: string;
  EXPERIMENTAL_ai_generated_description?: string;
  source_code_url?: string;
  github_stars?: number;
  package_registry?: string;
  package_name?: string;
  package_download_count?: number;
  remotes?: Array<{
    url_direct?: string | null;
    url_setup?: string | null;
    transport: string;
    authentication_method: string;
    cost: string;
  }>;
}

interface PulseMCPApiResponse {
  servers: RawMCPServer[];
  next?: string;
  total_count: number;
}

const PULSE_MCP_BASE_URL = 'https://api.pulsemcp.com/v0beta';

export async function fetchMCPServers(
  page: number = 1, 
  limit: number = 12, 
  search?: string
): Promise<PulseMCPResponse> {
  try {
    // Build API URL with proper parameters
    const params = new URLSearchParams();
    
    if (search && search.trim()) {
      params.append('query', search.trim());
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    if (offset > 0) {
      params.append('offset', offset.toString());
    }
    
    params.append('count_per_page', limit.toString());
    
    const url = `${PULSE_MCP_BASE_URL}/servers${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MCP-Dashboard/1.0 (https://mcp-dashboard.com)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch MCP servers: ${response.statusText}`);
    }
    
    const data: PulseMCPApiResponse = await response.json();
    const servers = data.servers || [];
    
    // No need for client-side filtering/pagination - API handles it
    const total = data.total_count;
    const hasNext = !!data.next;
    const hasPrev = page > 1;
    
    return {
      servers: servers.map((server: RawMCPServer) => ({
        name: server.name,
        url: server.url,
        externalUrl: server.external_url,
        description: server.short_description || server.EXPERIMENTAL_ai_generated_description || '',
        sourceCodeUrl: server.source_code_url,
        githubStars: server.github_stars,
        packageDownloads: server.package_download_count,
        packageRegistry: server.package_registry ? {
          type: server.package_registry,
          url: server.package_name || ''
        } : undefined,
        authMethods: server.remotes?.map(remote => ({
          type: remote.authentication_method as 'oauth' | 'api_key' | 'none',
          setupUrl: remote.url_setup || undefined,
          directUrl: remote.url_direct || undefined,
          transport: remote.transport,
          cost: remote.cost
        })) || []
      })),
      pagination: {
        total,
        page,
        limit,
        hasNext,
        hasPrev,
      }
    };
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    throw error;
  }
}