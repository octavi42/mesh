import { ConnectedAccount } from './auth';

export interface ToolExecutionConfig {
  connectionId: string;
  authConfigId: string;
  entityId: string;
}

export interface ToolAction {
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute a Composio tool using a connected account
 */
export async function executeComposioTool(
  connection: ConnectedAccount,
  action: ToolAction,
  apiKey: string
): Promise<ToolResponse> {
  if (!connection.authConfigId) {
    throw new Error('Auth config ID is required for tool execution');
  }

  const config: ToolExecutionConfig = {
    connectionId: connection.id,
    authConfigId: connection.authConfigId,
    entityId: connection.entityId,
  };

  try {
    const response = await fetch('/api/composio/v2/actions/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        actionName: action.name,
        params: action.parameters,
        entityId: config.entityId,
        connectedAccountId: config.connectionId,
        authConfig: {
          id: config.authConfigId
        }
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get available actions for a connected integration
 */
export async function getAvailableActions(
  integrationId: string,
  apiKey: string
): Promise<{ actions: any[] }> {
  const response = await fetch(`/api/composio/v2/apps/${integrationId}/actions`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch actions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Example tool usage functions
 */
export class ComposioToolkit {
  constructor(
    private connection: ConnectedAccount,
    private apiKey: string
  ) {
    if (!connection.authConfigId) {
      throw new Error('Connection must have authConfigId for tool execution');
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GMAIL_SEND_EMAIL',
        parameters: {
          to_email: to,
          subject: subject,
          body: body
        }
      },
      this.apiKey
    );
  }

  async createSlackMessage(channel: string, message: string): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'SLACK_SEND_MESSAGE',
        parameters: {
          channel: channel,
          text: message
        }
      },
      this.apiKey
    );
  }

  async createGoogleCalendarEvent(
    title: string,
    start: string,
    end: string,
    description?: string
  ): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GOOGLECALENDAR_CREATE_EVENT',
        parameters: {
          summary: title,
          start: { dateTime: start },
          end: { dateTime: end },
          description: description
        }
      },
      this.apiKey
    );
  }

  // GitHub tools
  async createGitHubIssue(repo: string, title: string, body?: string): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GITHUB_CREATE_ISSUE',
        parameters: {
          repository: repo,
          title: title,
          body: body || ''
        }
      },
      this.apiKey
    );
  }

  async listGitHubRepos(): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GITHUB_LIST_REPOS',
        parameters: {}
      },
      this.apiKey
    );
  }

  async createPullRequest(
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GITHUB_CREATE_PULL_REQUEST',
        parameters: {
          repository: repo,
          title: title,
          head: head,
          base: base,
          body: body || ''
        }
      },
      this.apiKey
    );
  }

  // Gmail tools  
  async listEmails(maxResults: number = 10): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GMAIL_LIST_EMAILS',
        parameters: {
          maxResults: maxResults
        }
      },
      this.apiKey
    );
  }

  async readEmail(messageId: string): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GMAIL_GET_EMAIL',
        parameters: {
          messageId: messageId
        }
      },
      this.apiKey
    );
  }

  // Google Drive tools
  async listDriveFiles(): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GOOGLEDRIVE_LIST_FILES',
        parameters: {}
      },
      this.apiKey
    );
  }

  async createDriveFolder(name: string): Promise<ToolResponse> {
    return executeComposioTool(
      this.connection,
      {
        name: 'GOOGLEDRIVE_CREATE_FOLDER',
        parameters: {
          name: name
        }
      },
      this.apiKey
    );
  }

  // Add more tool methods as needed for different integrations
}

/**
 * Create a toolkit instance from a connected account
 */
export function createToolkit(
  connection: ConnectedAccount,
  apiKey: string
): ComposioToolkit {
  return new ComposioToolkit(connection, apiKey);
}