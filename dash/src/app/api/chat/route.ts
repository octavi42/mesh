import { NextRequest, NextResponse } from 'next/server';
import { MemoryEnhancedChatAgent, ChatMessage } from '@/lib/memory/services/memory-enhanced-chat-agent';
import { OpenAIChatAgent, ChatMessage as OpenAIChatMessage } from '@/lib/openai-tools';
import { initializeGlobalMemorySystem, getMemorySystem } from '@/lib/memory';
import { getAuthService } from '@/lib/auth';

let memorySystemInitialized = false;
let memorySystemAvailable = false;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, projectId, userId, conversationId } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const composioApiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    if (!composioApiKey) {
      return NextResponse.json(
        { error: 'Composio API key not configured' },
        { status: 500 }
      );
    }

    // Initialize memory system if not already done
    if (!memorySystemInitialized) {
      try {
        // Only try to initialize if we have database credentials
        const hasDbConfig = process.env.DATABASE_PASSWORD && process.env.DATABASE_PASSWORD !== '';
        
        if (hasDbConfig) {
          await initializeGlobalMemorySystem({
            database: {
              database: process.env.DATABASE_NAME || 'teamai_memory',
              user: process.env.DATABASE_USER || 'postgres',
              password: process.env.DATABASE_PASSWORD,
              host: process.env.DATABASE_HOST || 'localhost',
              port: parseInt(process.env.DATABASE_PORT || '5432'),
              ssl: process.env.DATABASE_SSL === 'true'
            },
            cache: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              password: process.env.REDIS_PASSWORD,
              db: parseInt(process.env.REDIS_DB || '0')
            },
            openai: {
              apiKey: openaiApiKey
            },
            memory: {
              maxContextTokens: 15000,
              cacheEnabled: true,
              summaryThreshold: 20
            }
          });
          memorySystemAvailable = true;
          console.log('✅ Memory system initialized successfully');
        } else {
          console.log('⚠️ Database credentials not configured, skipping memory system initialization');
          memorySystemAvailable = false;
        }
        memorySystemInitialized = true;
      } catch (error) {
        console.error('⚠️ Memory system initialization failed, will use fallback mode:', error);
        memorySystemAvailable = false;
        memorySystemInitialized = true; // Mark as initialized to avoid retrying
      }
    }

    const { connections } = body;
    
    if (!connections || Object.keys(connections).length === 0) {
      return NextResponse.json({
        response: "No integrations are connected yet. Please connect some integrations first to use them in chat.",
        toolCalls: [],
        functionResults: [],
        conversationId: conversationId || 'temp'
      });
    }

    console.log(`💬 Chat request with connections: ${Object.keys(connections)} (Memory: ${memorySystemAvailable ? 'enabled' : 'disabled'})`);

    // Use memory-enhanced chat agent if available, fall back to basic agent otherwise
    let result;
    
    if (memorySystemAvailable) {
      try {
        const memorySystem = getMemorySystem();
        const memoryService = memorySystem.getMemoryService();
        const chatAgent = new MemoryEnhancedChatAgent(openaiApiKey, memoryService);

        result = await chatAgent.chat(
          messages as ChatMessage[],
          connections,
          composioApiKey,
          userId,
          conversationId
        );
        
        console.log('✅ Memory-enhanced chat response generated');
      } catch (memoryError) {
        console.error('❌ Memory-enhanced chat failed, falling back to basic mode:', memoryError);
        // Fall back to basic agent
        const basicChatAgent = new OpenAIChatAgent(openaiApiKey);
        result = await basicChatAgent.chat(
          messages as OpenAIChatMessage[],
          connections,
          composioApiKey
        );
        
        // Add conversationId to result for compatibility
        result.conversationId = conversationId || 'temp';
        console.log('✅ Fallback chat response generated');
      }
    } else {
      // Use basic OpenAI chat agent
      const basicChatAgent = new OpenAIChatAgent(openaiApiKey);
      result = await basicChatAgent.chat(
        messages as OpenAIChatMessage[],
        connections,
        composioApiKey
      );
      
      // Add conversationId to result for compatibility
      result.conversationId = conversationId || 'temp';
      console.log('✅ Basic chat response generated');
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}