'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Settings, Zap } from 'lucide-react';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { ConnectionProvider, useConnection } from '@/contexts/ConnectionContext';
import { useProject } from '@/contexts/ProjectContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  functionResults?: Array<{
    success: boolean;
    result: any;
    error?: string;
  }>;
}

function TimeStamp({ timestamp }: { timestamp: Date }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="text-xs opacity-70 mt-2">--:--:--</div>;
  }

  return (
    <div className="text-xs opacity-70 mt-2">
      {timestamp.toLocaleTimeString()}
    </div>
  );
}

function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Hello! I\'m your AI assistant powered by OpenAI and Composio with advanced memory capabilities. I can help you interact with your connected integrations using natural language.\n\nI now remember our previous conversations and can learn from our interactions to provide more personalized assistance.\n\nTry asking me to:\n• "Send an email to someone"\n• "Create a GitHub issue"\n• "List my repositories"\n• "Post a message to Slack"\n\nWhat would you like to do?',
      timestamp: new Date(),
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Generate a temporary userId for development - in production, this would come from authentication
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const { connections } = useConnection();
  const { currentProject } = useProject();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getConnectedIntegrations = () => {
    return Object.entries(connections)
      .filter(([_, conn]) => conn.status?.toLowerCase() === 'active')
      .map(([id, conn]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        connection: conn
      }));
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
      const connectedIntegrations = getConnectedIntegrations();
      
      if (connectedIntegrations.length === 0) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I don\'t see any connected integrations. Please go back to the dashboard and connect some services first, then return to chat with me!',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Prepare the conversation history
      const chatMessages = messages.concat([userMessage]).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('🚀 Sending chat request with connections:', Object.keys(connections));

      // Call the chat API with memory support
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatMessages,
          connections: connections,
          projectId: currentProject?.id || 'default',
          userId: userId,
          conversationId: conversationId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Chat request failed');
      }

      // Update conversation ID if provided by the API
      if (result.conversationId && !conversationId) {
        setConversationId(result.conversationId);
        console.log('💭 Started new conversation:', result.conversationId);
      }

      // Create assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: result.response || 'I apologize, but I couldn\'t process that request.',
        timestamp: new Date(),
        toolCalls: result.toolCalls || [],
        functionResults: result.functionResults || []
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const connectedCount = getConnectedIntegrations().length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Chat Assistant</h1>
                <p className="text-sm text-gray-500">
                  Powered by OpenAI • {connectedCount} integrations connected
                </p>
              </div>
            </div>
            
            <a 
              href="/"
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              <span>Dashboard</span>
            </a>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)] flex flex-col">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-3 max-w-[85%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Tool Calls Display */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-3 p-3 bg-black/10 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Zap className="w-4 h-4" />
                          <span className="text-sm font-medium">Function Calls</span>
                        </div>
                        {message.toolCalls.map((call, index) => (
                          <div key={call.id} className="text-xs space-y-1">
                            <div><strong>Function:</strong> {call.function.name}</div>
                            <div><strong>Arguments:</strong> {call.function.arguments}</div>
                            {message.functionResults?.[index] && (
                              <div>
                                <strong>Result:</strong> {
                                  message.functionResults[index].success 
                                    ? '✅ Success' 
                                    : `❌ ${message.functionResults[index].error}`
                                }
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <TimeStamp timestamp={message.timestamp} />
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
                  <div className="px-4 py-3 bg-gray-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to do something with your connected integrations..."
                className="flex-1 resize-none px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
  
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Configuration Error</h1>
          <p className="text-gray-300">NEXT_PUBLIC_COMPOSIO_API_KEY environment variable is required.</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectProvider>
      <ConnectionProvider apiKey={apiKey}>
        <ChatInterface />
      </ConnectionProvider>
    </ProjectProvider>
  );
}