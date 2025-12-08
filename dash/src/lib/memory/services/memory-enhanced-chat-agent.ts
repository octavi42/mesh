import OpenAI from 'openai';
import { ConnectedAccount } from '../../auth';
import { executeComposioAction, getIntegrationActions, ComposioAction } from '../../dynamic-tools';
import { MemoryService } from './memory-service';
import { 
  MemoryType, 
  MemoryScopeType, 
  BaseMemory, 
  ChatMessage as MemoryChatMessage,
  ContextAssembly,
  ProceduralMemory
} from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
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

export class MemoryEnhancedChatAgent {
  private openai: OpenAI;
  private memoryService: MemoryService;
  private availableActions: Map<string, ComposioAction[]> = new Map();

  constructor(apiKey: string, memoryService: MemoryService) {
    this.openai = new OpenAI({ apiKey });
    this.memoryService = memoryService;
  }

  async chat(
    messages: ChatMessage[],
    connections: Record<string, ConnectedAccount>,
    composioApiKey: string,
    userId: string,
    conversationId?: string
  ): Promise<{
    response: string;
    toolCalls?: ToolCall[];
    functionResults?: ToolExecutionResult[];
    conversationId: string;
  }> {
    console.log('🧠 Starting memory-enhanced chat session');

    // Ensure we have a conversation ID
    if (!conversationId) {
      const userMessage = messages.find(m => m.role === 'user');
      const title = userMessage ? 
        userMessage.content.substring(0, 50) + (userMessage.content.length > 50 ? '...' : '') :
        'New Conversation';
      
      conversationId = await this.memoryService.createConversation(userId, title);
    }

    // Load available actions for connected integrations
    await this.loadActionsForIntegrations(connections, composioApiKey);
    
    const functions = this.generateFunctionDefinitions();
    console.log(`🤖 Memory-enhanced chat with ${functions.length} available functions`);

    // Get the latest user message for context assembly
    const latestUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!latestUserMessage) {
      throw new Error('No user message found');
    }

    // Assemble context using memory system
    const context = await this.memoryService.assembleContext(
      userId,
      latestUserMessage.content,
      conversationId
    );

    // Store the user message in memory
    await this.storeUserMessage(conversationId, latestUserMessage, userId);

    // Create enhanced system message with memory context
    const systemMessage = this.createMemoryEnhancedSystemMessage(context, connections);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-0125-preview',
        messages: [systemMessage, ...messages],
        functions: functions.length > 0 ? functions : undefined,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 2000
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
          composioApiKey,
          userId
        );

        // Store procedural memory about tool usage
        await this.storeProcedural(
          userId,
          functionName,
          functionArgs,
          executionResult,
          conversationId
        );

        // Create follow-up message with function result
        const functionMessages: ChatMessage[] = [
          ...messages,
          {
            role: 'assistant',
            content: message.content || '',
          },
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(executionResult)
          }
        ];

        // Get final response from OpenAI
        const finalResponse = await this.openai.chat.completions.create({
          model: 'gpt-4-0125-preview',
          messages: [systemMessage, ...functionMessages],
          temperature: 0.7,
          max_tokens: 1500
        });

        const finalContent = finalResponse.choices[0].message.content || 'Action completed.';

        // Store assistant's response in memory
        await this.storeAssistantMessage(conversationId, finalContent, userId, {
          toolCall: functionName,
          toolArgs: functionArgs,
          toolResult: executionResult
        });

        return {
          response: finalContent,
          toolCalls: [{
            id: 'call_' + Date.now(),
            type: 'function',
            function: {
              name: functionName,
              arguments: JSON.stringify(functionArgs)
            }
          }],
          functionResults: [executionResult],
          conversationId
        };
      }

      // No function call - regular response
      const responseContent = message.content || 'I apologize, but I couldn\'t process that request.';
      
      // Store assistant's response in memory
      await this.storeAssistantMessage(conversationId, responseContent, userId);

      return {
        response: responseContent,
        conversationId
      };

    } catch (error) {
      console.error('Memory-enhanced chat error:', error);
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadActionsForIntegrations(
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

  private generateFunctionDefinitions(): any[] {
    const functions: any[] = [];

    for (const [integrationId, actions] of this.availableActions.entries()) {
      for (const action of actions.slice(0, 8)) { // Limit to prevent token overflow
        const properties: any = {};
        const required: string[] = [];

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

  private async executeFunction(
    functionName: string,
    args: any,
    connections: Record<string, ConnectedAccount>,
    composioApiKey: string,
    userId: string
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

      // Execute the action using the dynamic tools
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

  private createMemoryEnhancedSystemMessage(
    context: ContextAssembly,
    connections: Record<string, ConnectedAccount>
  ): ChatMessage {
    const connectedIntegrations = Object.entries(connections)
      .filter(([_, conn]) => conn.status?.toLowerCase() === 'active')
      .map(([id]) => id)
      .join(', ');

    let systemContent = `You are an AI assistant with access to connected integrations: ${connectedIntegrations}.

You have access to various functions to help users interact with their connected services.`;

    // Add conversation summary if available
    if (context.conversationSummary) {
      systemContent += `\n\nConversation Summary: ${context.conversationSummary}`;
    }

    // Add relevant memories
    if (context.relevantMemories && context.relevantMemories.length > 0) {
      systemContent += `\n\nRelevant Context from Previous Interactions:`;
      context.relevantMemories.slice(0, 3).forEach((memory, idx) => {
        systemContent += `\n${idx + 1}. ${memory.content}`;
      });
    }

    // Add user persona insights
    if (context.userPersona) {
      systemContent += `\n\nUser Preferences:`;
      if (context.userPersona.traits.communicationStyle) {
        systemContent += `\n- Communication style: ${context.userPersona.traits.communicationStyle}`;
      }
      if (context.userPersona.traits.preferredIntegrations.length > 0) {
        systemContent += `\n- Preferred integrations: ${context.userPersona.traits.preferredIntegrations.join(', ')}`;
      }
    }

    systemContent += `\n\nWhen users request actions:
1. Analyze their request carefully
2. Use the appropriate function to execute the action
3. Provide clear feedback about what was accomplished
4. If you need more information, ask the user

Be helpful, accurate, and execute requested actions when possible. Use the context above to provide personalized responses.`;

    return {
      role: 'system',
      content: systemContent
    };
  }

  private async storeUserMessage(
    conversationId: string,
    message: ChatMessage,
    userId: string
  ): Promise<void> {
    const memoryChatMessage: Omit<MemoryChatMessage, 'id' | 'timestamp'> = {
      conversationId,
      role: message.role as 'user',
      content: message.content,
      tokenCount: this.estimateTokenCount(message.content)
    };

    await this.memoryService.storeConversationMessage(conversationId, memoryChatMessage);
  }

  private async storeAssistantMessage(
    conversationId: string,
    content: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    const memoryChatMessage: Omit<MemoryChatMessage, 'id' | 'timestamp'> = {
      conversationId,
      role: 'assistant',
      content,
      tokenCount: this.estimateTokenCount(content),
      functionCalls: metadata ? [metadata] : undefined
    };

    await this.memoryService.storeConversationMessage(conversationId, memoryChatMessage);
  }

  private async storeProcedural(
    userId: string,
    functionName: string,
    args: any,
    result: ToolExecutionResult,
    conversationId: string
  ): Promise<void> {
    // Extract integration and action from function name
    const parts = functionName.split('_');
    const integrationId = parts[0];
    const actionName = parts.slice(1).join('_');

    const proceduralMemory: Omit<ProceduralMemory, 'id' | 'timestamp'> = {
      type: MemoryType.PROCEDURAL,
      content: `Used ${actionName} on ${integrationId}: ${result.success ? 'Success' : 'Failed'}`,
      metadata: {
        functionName,
        arguments: args,
        result: result.result,
        success: result.success,
        error: result.error,
        conversationId
      },
      userId,
      scope: {
        id: userId,
        type: MemoryScopeType.USER,
        isolation: 'private'
      },
      integrationId,
      actionName,
      parameters: args,
      success: result.success,
      executionTime: Date.now() // Simple timestamp for now
    };

    await this.memoryService.storeMemory(proceduralMemory);
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}