'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { useConnection } from '@/contexts/ConnectionContext';
import { useProject } from '@/contexts/ProjectContext';
import { DynamicToolExecutor, getIntegrationActions, ComposioAction } from '@/lib/dynamic-tools';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    parameters: any;
    result?: any;
    confidence?: number;
  };
}

interface ChatProps {
  apiKey: string;
}

export default function Chat({ apiKey }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you interact with your connected integrations. Just tell me what you want to do in plain English!\n\nExamples:\n• "Send an email to john@example.com about the meeting"\n• "Create a GitHub issue for the login bug"\n• "List my recent emails"\n• "Send a message to the team channel"',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableActions, setAvailableActions] = useState<Record<string, ComposioAction[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { connections, isConnected } = useConnection();
  const { currentProject } = useProject();
  const toolExecutor = new DynamicToolExecutor(apiKey);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load available actions for connected tools
  useEffect(() => {
    const loadActions = async () => {
      if (!currentProject) return;

      const connectedIntegrations = currentProject.integrations
        .filter(integrationId => isConnected(integrationId));

      for (const integrationId of connectedIntegrations) {
        if (!availableActions[integrationId]) {
          try {
            const actions = await getIntegrationActions(integrationId, apiKey);
            setAvailableActions(prev => ({
              ...prev,
              [integrationId]: actions
            }));
          } catch (error) {
            console.error(`Failed to load actions for ${integrationId}:`, error);
          }
        }
      }
    };

    loadActions();
  }, [currentProject?.integrations, connections, apiKey]);

  const getConnectedTools = () => {
    if (!currentProject) return [];
    
    return currentProject.integrations
      .filter(integrationId => isConnected(integrationId))
      .map(integrationId => ({
        id: integrationId,
        connection: connections[integrationId],
        name: integrationId.charAt(0).toUpperCase() + integrationId.slice(1),
        actionsCount: availableActions[integrationId]?.length || 0
      }));
  };

  const detectIntentionFromMessage = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();
    
    // Look for integration mentions
    const connectedTools = getConnectedTools();
    
    for (const tool of connectedTools) {
      if (lowerMessage.includes(tool.id) || lowerMessage.includes(tool.name.toLowerCase())) {
        return tool.id;
      }
    }

    // Look for common service keywords
    if (lowerMessage.includes('email') || lowerMessage.includes('gmail')) {
      return connectedTools.find(t => t.id.includes('gmail'))?.id || null;
    }
    
    if (lowerMessage.includes('github') || lowerMessage.includes('repo')) {
      return connectedTools.find(t => t.id.includes('github'))?.id || null;
    }
    
    if (lowerMessage.includes('slack') || lowerMessage.includes('message')) {
      return connectedTools.find(t => t.id.includes('slack'))?.id || null;
    }

    // If only one tool is connected, assume they want to use it
    if (connectedTools.length === 1) {
      return connectedTools[0].id;
    }

    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const connectedTools = getConnectedTools();
      
      if (connectedTools.length === 0) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'No tools are connected yet. Please connect some integrations first to use them in chat.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Detect which integration the user wants to use
      const targetIntegration = detectIntentionFromMessage(currentInput);
      
      if (!targetIntegration) {
        const toolsList = connectedTools.map(t => `${t.name} (${t.actionsCount} actions)`).join(', ');
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I couldn't determine which service you want to use. You have these tools connected: ${toolsList}

Try being more specific:
• "Send an email to john@example.com about the meeting"
• "Create a GitHub issue titled 'Login bug'"
• "List my repositories"
• "Post a message to the team channel"`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Check if the target integration is connected
      if (!isConnected(targetIntegration)) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `${targetIntegration.charAt(0).toUpperCase() + targetIntegration.slice(1)} is not connected. Please connect it first.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Execute using dynamic tool executor
      const connection = connections[targetIntegration];
      console.log(`🎯 Executing "${currentInput}" on ${targetIntegration}`);
      
      const result = await toolExecutor.executeFromNaturalLanguage(
        targetIntegration,
        currentInput,
        connection
      );

      // Create response message
      let content = '';
      let toolCall = undefined;

      if (result.success) {
        content = `✅ Successfully executed action on ${targetIntegration}!`;
        
        // Try to format the result nicely
        if (result.data) {
          if (typeof result.data === 'string') {
            content += `\n\nResult: ${result.data}`;
          } else if (result.data.message) {
            content += `\n\nResult: ${result.data.message}`;
          } else if (result.data.url) {
            content += `\n\nCreated: ${result.data.url}`;
          } else {
            content += `\n\nResult: ${JSON.stringify(result.data, null, 2)}`;
          }
        }
      } else {
        content = `❌ Failed to execute action on ${targetIntegration}`;
        if (result.error) {
          content += `\n\nError: ${result.error}`;
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: content,
        timestamp: new Date(),
        toolCall: result.success ? {
          name: `${targetIntegration}_dynamic_action`,
          parameters: { userInput: currentInput },
          result: result.data
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat execution error:', error);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        <div className="text-sm text-gray-500">
          {getConnectedTools().length} tools connected
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start space-x-3 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.toolCall && (
                  <div className="mt-2 p-2 bg-black/10 rounded text-xs">
                    <strong>Tool:</strong> {message.toolCall.name}<br/>
                    <strong>Params:</strong> {JSON.stringify(message.toolCall.parameters, null, 2)}
                  </div>
                )}
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="px-4 py-2 bg-gray-100 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message... (e.g., 'Send email to user@example.com')"
            className="flex-1 resize-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}