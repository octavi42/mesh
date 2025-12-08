import OpenAI from 'openai';
import { ConnectedAccount } from './auth';
import { executeComposioAction, getIntegrationActions, ComposioAction } from './dynamic-tools';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolExecutionResult {
  success: boolean;
  result: any;
  error?: string;
}

export class OpenAIChatAgent {
  private openai: OpenAI;
  private availableActions: Map<string, ComposioAction[]> = new Map();

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async loadActionsForIntegrations(
    connections: Record<string, ConnectedAccount>,
    composioApiKey: string
  ): Promise<void> {
    for (const [integrationId, connection] of Object.entries(connections)) {
      if (connection.status?.toLowerCase() === 'active') {
        try {
          const actions = await getIntegrationActions(integrationId, composioApiKey);
          this.availableActions.set(integrationId, actions);
          console.log(`📚 Loaded ${actions.length} actions for ${integrationId}`);
        } catch (error) {
          console.error(`Failed to load actions for ${integrationId}:`, error);
        }
      }
    }
  }

  generateFunctionDefinitions(): any[] {
    const functions: any[] = [];

    for (const [integrationId, actions] of this.availableActions.entries()) {
      for (const action of actions.slice(0, 10)) { // Limit to 10 actions per integration to avoid token limits
        const properties: any = {};
        const required: string[] = [];

        // Convert Composio action parameters to OpenAI function schema
        if (action.parameters?.properties) {
          for (const [paramName, paramSchema] of Object.entries(action.parameters.properties)) {
            const schema = paramSchema as any;
            properties[paramName] = {
              type: schema.type || 'string',
              description: schema.description || `Parameter ${paramName}`,
            };

            if (schema.enum) {
              properties[paramName].enum = schema.enum;
            }
          }
        }

        if (action.parameters?.required) {
          required.push(...action.parameters.required);
        }

        functions.push({
          name: `${integrationId}_${action.name.toLowerCase()}`,
          description: `${action.description || action.display_name || action.name} for ${integrationId}`,
          parameters: {
            type: 'object',
            properties: properties,
            required: required
          }
        });
      }
    }

    // Add utility functions
    functions.push({
      name: 'list_available_integrations',
      description: 'List all connected integrations and their capabilities',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    });

    return functions;
  }

  async executeFunction(
    functionName: string,
    args: any,
    connections: Record<string, ConnectedAccount>,
    composioApiKey: string
  ): Promise<ToolExecutionResult> {
    try {
      // Handle utility functions
      if (functionName === 'list_available_integrations') {
        const integrations = Object.entries(connections)
          .filter(([_, conn]) => conn.status?.toLowerCase() === 'active')
          .map(([id, conn]) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            actions: this.availableActions.get(id)?.length || 0
          }));

        return {
          success: true,
          result: {
            connected_integrations: integrations,
            total_actions: Array.from(this.availableActions.values()).flat().length
          }
        };
      }

      // Parse function name to get integration and action
      const parts = functionName.split('_');
      if (parts.length < 2) {
        throw new Error(`Invalid function name format: ${functionName}`);
      }

      const integrationId = parts[0];
      const actionName = parts.slice(1).join('_').toUpperCase();

      // Find the connection
      const connection = connections[integrationId];
      if (!connection) {
        throw new Error(`Integration ${integrationId} is not connected`);
      }

      // Find the action
      const actions = this.availableActions.get(integrationId) || [];
      const action = actions.find(a => a.name.toLowerCase() === actionName.toLowerCase());
      
      if (!action) {
        throw new Error(`Action ${actionName} not found for ${integrationId}`);
      }

      console.log(`🔧 Executing ${action.name} on ${integrationId} with args:`, args);

      // Execute the action
      const result = await executeComposioAction(
        action.name,
        args,
        connection,
        composioApiKey
      );

      return {
        success: result.success,
        result: result.data,
        error: result.error
      };

    } catch (error) {
      console.error('Function execution error:', error);
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async chat(
    messages: ChatMessage[],
    connections: Record<string, ConnectedAccount>,
    composioApiKey: string
  ): Promise<{
    response: string;
    toolCalls?: ToolCall[];
    functionResults?: ToolExecutionResult[];
  }> {
    // Load available actions
    await this.loadActionsForIntegrations(connections, composioApiKey);
    
    const functions = this.generateFunctionDefinitions();
    
    console.log(`🤖 OpenAI Chat with ${functions.length} available functions`);

    // Create system message with context
    const connectedIntegrations = Object.entries(connections)
      .filter(([_, conn]) => conn.status?.toLowerCase() === 'active')
      .map(([id]) => id)
      .join(', ');

    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are an AI assistant that can interact with connected integrations: ${connectedIntegrations}.

You have access to various functions to help users interact with their connected services. When users request actions:

1. Analyze their request carefully
2. Use the appropriate function to execute the action
3. Provide clear feedback about what was accomplished
4. If you need more information to execute an action, ask the user

Available integrations: ${connectedIntegrations}

Always be helpful, accurate, and execute the requested actions when possible.`
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-0125-preview',
        messages: [systemMessage, ...messages],
        functions: functions.length > 0 ? functions : undefined,
        function_call: 'auto',
        temperature: 0.7,
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Handle function calls
      if (message.function_call) {
        const functionName = message.function_call.name;
        const functionArgs = JSON.parse(message.function_call.arguments || '{}');

        console.log(`🎯 Function call: ${functionName}`, functionArgs);

        const executionResult = await this.executeFunction(
          functionName,
          functionArgs,
          connections,
          composioApiKey
        );

        // Truncate large function responses to avoid context length issues
        const truncateResult = (result: any, maxLength: number = 15000): string => {
          const jsonString = JSON.stringify(result, null, 2);
          if (jsonString.length <= maxLength) {
            return jsonString;
          }
          
          // Special handling for Gmail email fetch results
          if (result.success && result.result && result.result.messages) {
            const messages = result.result.messages;
            const truncatedMessages = messages.slice(0, 5).map((msg: any) => ({
              id: msg.id,
              threadId: msg.threadId,
              snippet: msg.snippet || 'No snippet available',
              // Extract key headers if available
              subject: msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No subject',
              from: msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown sender',
              date: msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'date')?.value || 'Unknown date',
              // Extract body preview if available
              bodyPreview: msg.payload?.parts?.[0]?.body?.data ? 
                (typeof msg.payload.parts[0].body.data === 'string' ? 
                  msg.payload.parts[0].body.data.substring(0, 200) + '...' : 
                  'Body data available') : 'No body preview',
              labelIds: msg.labelIds
            }));

            const summary = {
              success: result.success,
              result: {
                messages: truncatedMessages,
                totalMessages: messages.length,
                nextPageToken: result.result.nextPageToken,
                resultSizeEstimate: result.result.resultSizeEstimate,
                truncationNote: `Showing ${Math.min(5, messages.length)} of ${messages.length} messages with essential details only`
              }
            };
            return JSON.stringify(summary, null, 2);
          }
          
          // If the result is successful but too large, provide a summary
          if (result.success && result.result) {
            const summary = {
              success: result.success,
              summary: `Response truncated. Original length: ${jsonString.length} chars.`,
              result_type: Array.isArray(result.result) ? `Array with ${result.result.length} items` : typeof result.result,
              ...(result.result.nextPageToken && { has_more_pages: true }),
              ...(result.result.resultSizeEstimate && { total_estimated: result.result.resultSizeEstimate })
            };
            return JSON.stringify(summary, null, 2);
          }
          
          // Fallback: truncate and add notice
          return jsonString.substring(0, maxLength) + `\n... [TRUNCATED - Original length: ${jsonString.length} chars]`;
        };

        // Create a follow-up message with the function result
        const functionMessages: ChatMessage[] = [
          ...messages,
          {
            role: 'assistant',
            content: message.content || '',
            function_call: message.function_call
          },
          {
            role: 'function',
            name: functionName,
            content: truncateResult(executionResult)
          }
        ];

        // Get the final response from OpenAI
        const finalResponse = await this.openai.chat.completions.create({
          model: 'gpt-4-0125-preview',
          messages: [systemMessage, ...functionMessages],
          temperature: 0.7,
        });

        return {
          response: finalResponse.choices[0].message.content || 'Action completed.',
          toolCalls: [{
            id: 'call_' + Date.now(),
            type: 'function',
            function: {
              name: functionName,
              arguments: JSON.stringify(functionArgs)
            }
          }],
          functionResults: [executionResult]
        };
      }

      return {
        response: message.content || 'I apologize, but I couldn\'t process that request.'
      };

    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}