import { ConnectedAccount } from './auth';

export interface ComposioAction {
  name: string;
  display_name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  response: {
    type: string;
    properties: Record<string, any>;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  execution_details?: {
    executed: boolean;
    response_data: any;
  };
}

/**
 * Fetch all available actions for a connected integration
 */
export async function getIntegrationActions(
  integrationName: string,
  apiKey: string
): Promise<ComposioAction[]> {
  try {
    // Use the correct Composio v3 API endpoint
    const url = new URL('https://backend.composio.dev/api/v3/tools');
    url.searchParams.append('toolkit_slug', integrationName);
    url.searchParams.append('limit', '50'); // Reasonable limit for tools

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey, // v3 uses x-api-key instead of Authorization Bearer
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch actions for ${integrationName}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Convert Composio tool format to our ComposioAction format
    const tools = result.items || [];
    return tools.map((tool: any) => ({
      name: tool.slug,
      display_name: tool.name || tool.slug,
      description: tool.description || `${tool.name} tool`,
      parameters: {
        type: 'object',
        properties: tool.input_schema?.properties || {},
        required: tool.input_schema?.required || []
      },
      response: {
        type: 'object',
        properties: tool.output_schema?.properties || {}
      }
    }));
  } catch (error) {
    console.error(`Error fetching actions for ${integrationName}:`, error);
    return [];
  }
}

/**
 * Execute any Composio action dynamically
 */
export async function executeComposioAction(
  actionName: string,
  parameters: Record<string, any>,
  connection: ConnectedAccount,
  apiKey: string
): Promise<ToolExecutionResult> {
  try {
    console.log(`🔧 Executing action: ${actionName}`, { parameters, connectionId: connection.id });

    // Use the correct Composio v3 API endpoint format
    const url = `https://backend.composio.dev/api/v3/tools/execute/${actionName}`;

    const requestBody = {
      connected_account_id: connection.id,
      entity_id: connection.entityId || 'default',
      arguments: parameters // v3 API expects 'arguments' field instead of 'input'
    };

    console.log('📤 Request body:', requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey, // v3 uses x-api-key instead of Authorization Bearer
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log('📥 Action result:', result);

    if (!response.ok) {
      return {
        success: false,
        error: result.error?.message || result.message || `HTTP ${response.status}: ${response.statusText}`,
        data: result
      };
    }

    return {
      success: true,
      data: result.response_data || result.data || result,
      execution_details: result.execution_details
    };
  } catch (error) {
    console.error('❌ Action execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search for actions by natural language description
 */
export async function findActionsByDescription(
  integrationName: string,
  description: string,
  apiKey: string
): Promise<ComposioAction[]> {
  const actions = await getIntegrationActions(integrationName, apiKey);
  
  const searchTerms = description.toLowerCase().split(' ');
  
  return actions.filter(action => {
    const actionText = `${action.name} ${action.display_name} ${action.description}`.toLowerCase();
    return searchTerms.some(term => actionText.includes(term));
  }).sort((a, b) => {
    // Sort by relevance - actions with more matching terms first
    const aMatches = searchTerms.filter(term => 
      `${a.name} ${a.display_name} ${a.description}`.toLowerCase().includes(term)
    ).length;
    const bMatches = searchTerms.filter(term => 
      `${b.name} ${b.display_name} ${b.description}`.toLowerCase().includes(term)
    ).length;
    return bMatches - aMatches;
  });
}

/**
 * Smart action finder that maps natural language to specific actions
 */
export async function findBestAction(
  integrationName: string,
  intent: string,
  apiKey: string
): Promise<{ action: ComposioAction; confidence: number } | null> {
  const actions = await getIntegrationActions(integrationName, apiKey);
  
  // Define intent mapping patterns
  const intentPatterns = {
    'send email': ['send', 'create', 'compose'],
    'create issue': ['create', 'issue', 'bug'],
    'list repositories': ['list', 'get', 'repositories', 'repos'],
    'create repository': ['create', 'new', 'repository', 'repo'],
    'send message': ['send', 'post', 'message'],
    'create calendar': ['create', 'event', 'calendar'],
    'upload file': ['upload', 'create', 'file'],
    'list files': ['list', 'get', 'files'],
  };

  let bestMatch: { action: ComposioAction; confidence: number } | null = null;
  const intentLower = intent.toLowerCase();

  for (const action of actions) {
    let confidence = 0;
    const actionText = `${action.name} ${action.display_name} ${action.description}`.toLowerCase();

    // Direct name matching
    if (actionText.includes(intentLower)) {
      confidence += 0.8;
    }

    // Pattern matching
    for (const [pattern, keywords] of Object.entries(intentPatterns)) {
      if (intentLower.includes(pattern)) {
        const matchingKeywords = keywords.filter(keyword => actionText.includes(keyword));
        confidence += (matchingKeywords.length / keywords.length) * 0.6;
      }
    }

    // Word overlap
    const intentWords = intentLower.split(' ');
    const actionWords = actionText.split(' ');
    const overlap = intentWords.filter(word => actionWords.includes(word)).length;
    confidence += (overlap / intentWords.length) * 0.4;

    if (confidence > (bestMatch?.confidence || 0)) {
      bestMatch = { action, confidence };
    }
  }

  return bestMatch && bestMatch.confidence > 0.3 ? bestMatch : null;
}

/**
 * Generate parameters for an action based on user input
 */
export function extractParametersFromText(
  action: ComposioAction,
  userInput: string
): Record<string, any> {
  const parameters: Record<string, any> = {};
  const inputLower = userInput.toLowerCase();

  // Common parameter extraction patterns
  const patterns = {
    email: /(?:to\s+|email\s+)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    subject: /(?:subject\s+["']([^"']+)["']|subject\s+([^\s,]+))/g,
    title: /(?:title\s+["']([^"']+)["']|titled?\s+["']([^"']+)["'])/g,
    repository: /(?:repo(?:sitory)?\s+([^\s,]+)|in\s+([^\s,]+))/g,
    channel: /(?:channel\s+#?([^\s,]+)|to\s+#([^\s,]+))/g,
    message: /(?:saying\s+["']([^"']+)["']|message\s+["']([^"']+)["'])/g,
    body: /(?:body\s+["']([^"']+)["']|with\s+text\s+["']([^"']+)["'])/g,
    name: /(?:name\s+["']([^"']+)["']|named\s+["']([^"']+)["'])/g,
  };

  // Extract based on action parameter names
  if (action.parameters?.properties) {
    for (const [paramName, paramSchema] of Object.entries(action.parameters.properties)) {
      const paramLower = paramName.toLowerCase();
      
      // Try to match parameter name with extraction patterns
      for (const [patternName, regex] of Object.entries(patterns)) {
        if (paramLower.includes(patternName) || patternName.includes(paramLower)) {
          const matches = Array.from(userInput.matchAll(regex));
          if (matches.length > 0) {
            const value = matches[0][1] || matches[0][2];
            if (value) {
              parameters[paramName] = value.trim();
            }
          }
        }
      }

      // Set default values for required parameters not found
      if (action.parameters.required?.includes(paramName) && !parameters[paramName]) {
        const schema = paramSchema as any;
        if (schema.default) {
          parameters[paramName] = schema.default;
        } else if (schema.type === 'string') {
          parameters[paramName] = `Auto-generated ${paramName}`;
        } else if (schema.type === 'number') {
          parameters[paramName] = 1;
        } else if (schema.type === 'boolean') {
          parameters[paramName] = true;
        }
      }
    }
  }

  return parameters;
}

/**
 * Dynamic tool execution class
 */
export class DynamicToolExecutor {
  private actionCache: Map<string, ComposioAction[]> = new Map();

  constructor(private apiKey: string) {}

  async getActions(integrationName: string): Promise<ComposioAction[]> {
    if (this.actionCache.has(integrationName)) {
      return this.actionCache.get(integrationName)!;
    }

    const actions = await getIntegrationActions(integrationName, this.apiKey);
    this.actionCache.set(integrationName, actions);
    return actions;
  }

  async executeFromNaturalLanguage(
    integrationName: string,
    userInput: string,
    connection: ConnectedAccount
  ): Promise<ToolExecutionResult> {
    try {
      // Find the best matching action
      const match = await findBestAction(integrationName, userInput, this.apiKey);
      
      if (!match || match.confidence < 0.5) {
        return {
          success: false,
          error: `Could not find a suitable action for: "${userInput}". Try being more specific.`
        };
      }

      // Extract parameters from user input
      const parameters = extractParametersFromText(match.action, userInput);

      console.log(`🎯 Found action: ${match.action.name} (confidence: ${match.confidence.toFixed(2)})`);
      console.log(`📝 Extracted parameters:`, parameters);

      // Execute the action
      return await executeComposioAction(
        match.action.name,
        parameters,
        connection,
        this.apiKey
      );

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}