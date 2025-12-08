import OpenAI from 'openai';
import { 
  MemoryRepository, 
  ConversationRepository, 
  CacheRepository,
  PersonaRepository,
  RepositoryFactory 
} from '../repositories/interfaces';
import {
  BaseMemory,
  ConversationMemory,
  ChatMessage,
  ContextAssembly,
  TokenAllocation,
  MemoryType,
  MemoryScope,
  MemoryScopeType,
  SemanticSearchQuery,
  UserPersona
} from '../types';

export interface MemoryServiceConfig {
  maxContextTokens: number;
  embeddingModel: string;
  summaryThreshold: number; // Number of messages before summarization
  cacheEnabled: boolean;
  cacheTTL: number;
}

export class MemoryService {
  private memoryRepo: MemoryRepository;
  private conversationRepo: ConversationRepository;
  private cacheRepo: CacheRepository;
  private personaRepo: PersonaRepository;
  private openai: OpenAI;
  private config: MemoryServiceConfig;

  constructor(
    repositoryFactory: RepositoryFactory,
    openaiApiKey: string,
    config: Partial<MemoryServiceConfig> = {}
  ) {
    this.memoryRepo = repositoryFactory.createMemoryRepository();
    this.conversationRepo = repositoryFactory.createConversationRepository();
    this.cacheRepo = repositoryFactory.createCacheRepository();
    this.personaRepo = repositoryFactory.createPersonaRepository();
    
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    
    this.config = {
      maxContextTokens: 15000,
      embeddingModel: 'text-embedding-3-small',
      summaryThreshold: 20,
      cacheEnabled: true,
      cacheTTL: 3600,
      ...config
    };
  }

  // Context assembly - the core memory function
  async assembleContext(
    userId: string, 
    query: string, 
    conversationId?: string
  ): Promise<ContextAssembly> {
    console.log('🧠 Assembling context for user:', userId);

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = await this.cacheRepo.get(query, userId, 0.8);
      if (cached) {
        console.log('🎯 Using cached context');
        return cached.response;
      }
    }

    // Create query embedding for semantic search
    const queryEmbedding = await this.createEmbedding(query);

    // Allocate token budget
    const tokenBudget = this.allocateTokenBudget();
    let usedTokens = 0;

    // 1. Get recent conversation messages
    const recentMessages = conversationId 
      ? await this.conversationRepo.getRecentMessages(conversationId, 10)
      : [];
    
    const recentTokens = this.estimateTokenCount(JSON.stringify(recentMessages));
    usedTokens += Math.min(recentTokens, tokenBudget.recentMessages);

    // 2. Get relevant memories through semantic search
    const relevantMemories = await this.searchRelevantMemories(
      query,
      queryEmbedding,
      userId,
      tokenBudget.relevantMemories
    );
    
    const memoryTokens = this.estimateTokenCount(JSON.stringify(relevantMemories));
    usedTokens += Math.min(memoryTokens, tokenBudget.relevantMemories);

    // 3. Get user persona
    const userPersona = await this.getUserPersona(userId);
    const personaTokens = userPersona ? this.estimateTokenCount(JSON.stringify(userPersona)) : 0;
    usedTokens += Math.min(personaTokens, tokenBudget.userPersona);

    // 4. Get conversation summary if needed
    let conversationSummary: string | undefined;
    if (conversationId) {
      const messageCount = await this.conversationRepo.getMessageCount(conversationId);
      if (messageCount > this.config.summaryThreshold) {
        const conversation = await this.conversationRepo.findById(conversationId);
        conversationSummary = conversation?.summary;
        
        if (!conversationSummary) {
          conversationSummary = await this.generateConversationSummary(conversationId);
          await this.conversationRepo.updateSummary(conversationId, conversationSummary);
        }
      }
    }

    const summaryTokens = conversationSummary ? this.estimateTokenCount(conversationSummary) : 0;
    usedTokens += Math.min(summaryTokens, tokenBudget.conversationSummary);

    // 5. Assemble final context
    const context: ContextAssembly = {
      recentMessages,
      relevantMemories,
      userPersona,
      suggestedTools: [], // TODO: Implement tool suggestions
      conversationSummary,
      tokenBudget: {
        allocated: this.config.maxContextTokens,
        used: usedTokens,
        remaining: this.config.maxContextTokens - usedTokens
      }
    };

    // Cache the assembled context
    if (this.config.cacheEnabled) {
      await this.cacheRepo.set(query, context, userId, this.config.cacheTTL);
    }

    console.log(`💡 Context assembled: ${usedTokens}/${this.config.maxContextTokens} tokens used`);
    
    return context;
  }

  // Store a new memory
  async storeMemory(memory: Omit<BaseMemory, 'id' | 'timestamp'>): Promise<BaseMemory> {
    // Create embedding if content provided
    let embedding: number[] | undefined;
    if (memory.content && memory.content.trim()) {
      embedding = await this.createEmbedding(memory.content);
    }

    const memoryWithEmbedding: BaseMemory = {
      ...memory,
      id: '', // Will be generated by repository
      timestamp: new Date(),
      embedding
    };

    const saved = await this.memoryRepo.save(memoryWithEmbedding);
    console.log(`💾 Stored ${memory.type} memory for user ${memory.userId}`);
    
    return saved;
  }

  // Store conversation message and create related memories
  async storeConversationMessage(
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    // Store the message
    const savedMessage = await this.conversationRepo.addMessage(message);

    // Create embedding for the message
    const embedding = await this.createEmbedding(message.content);

    // Store as conversation memory
    const conversationMemory: ConversationMemory = {
      id: '',
      type: MemoryType.CONVERSATION,
      content: message.content,
      embedding,
      metadata: {
        role: message.role,
        conversationId,
        functionCalls: message.functionCalls
      },
      timestamp: new Date(),
      userId: (await this.conversationRepo.findById(conversationId))?.userId || '',
      scope: {
        id: conversationId,
        type: MemoryScopeType.USER,
        isolation: 'private'
      },
      conversationId,
      role: message.role,
      tokenCount: message.tokenCount || 0,
      functionCalls: message.functionCalls
    };

    await this.memoryRepo.save(conversationMemory);

    // Extract and store semantic memories (facts, insights, etc.)
    if (message.role === 'user') {
      await this.extractAndStoreSemanticMemories(message, savedMessage.id);
    }

    return savedMessage;
  }

  // Create or update conversation
  async createConversation(
    userId: string,
    title: string,
    projectId?: string
  ): Promise<string> {
    const conversation = await this.conversationRepo.create({
      userId,
      projectId,
      title,
      tokenCount: 0,
      lastActivity: new Date()
    });

    return conversation.id;
  }

  // Get conversation history with context
  async getConversationWithContext(
    conversationId: string,
    includeContext: boolean = true
  ): Promise<{
    conversation: any;
    messages: ChatMessage[];
    context?: ContextAssembly;
  }> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const messages = await this.conversationRepo.getMessages(conversationId);
    
    let context: ContextAssembly | undefined;
    if (includeContext && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      context = await this.assembleContext(
        conversation.userId,
        lastMessage.content,
        conversationId
      );
    }

    return {
      conversation,
      messages,
      context
    };
  }

  // Update user persona based on interactions
  async updateUserPersona(userId: string, message: ChatMessage): Promise<void> {
    // TODO: Implement persona learning logic
    // Analyze message for communication patterns, preferences, etc.
    console.log(`🎭 Updating persona for user ${userId} (placeholder)`);
  }

  // Search memories by semantic similarity
  async searchMemories(
    query: string,
    userId: string,
    memoryTypes?: MemoryType[],
    limit: number = 10
  ): Promise<BaseMemory[]> {
    const embedding = await this.createEmbedding(query);
    
    const searchQuery: SemanticSearchQuery = {
      query,
      embedding,
      memoryTypes,
      limit,
      similarityThreshold: 0.7,
      scope: {
        id: userId,
        type: MemoryScopeType.USER,
        isolation: 'private'
      }
    };

    const results = await this.memoryRepo.searchSemantic(searchQuery);
    return results.map(result => result.memory);
  }

  // Private helper methods

  private allocateTokenBudget(): TokenAllocation {
    return {
      recentMessages: Math.floor(this.config.maxContextTokens * 0.40),
      conversationSummary: Math.floor(this.config.maxContextTokens * 0.25),
      relevantMemories: Math.floor(this.config.maxContextTokens * 0.20),
      userPersona: Math.floor(this.config.maxContextTokens * 0.10),
      systemPrompt: Math.floor(this.config.maxContextTokens * 0.05)
    };
  }

  private async searchRelevantMemories(
    query: string,
    embedding: number[],
    userId: string,
    tokenLimit: number
  ): Promise<BaseMemory[]> {
    const searchQuery: SemanticSearchQuery = {
      query,
      embedding,
      memoryTypes: [MemoryType.SEMANTIC, MemoryType.EPISODIC, MemoryType.PROCEDURAL],
      limit: 20,
      similarityThreshold: 0.7,
      scope: {
        id: userId,
        type: MemoryScopeType.USER,
        isolation: 'private'
      }
    };

    const results = await this.memoryRepo.searchSemantic(searchQuery);
    
    // Filter by token budget
    const relevantMemories: BaseMemory[] = [];
    let currentTokens = 0;
    
    for (const result of results) {
      const memoryTokens = this.estimateTokenCount(result.memory.content);
      if (currentTokens + memoryTokens <= tokenLimit) {
        relevantMemories.push(result.memory);
        currentTokens += memoryTokens;
      } else {
        break;
      }
    }

    return relevantMemories;
  }

  private async getUserPersona(userId: string): Promise<UserPersona | undefined> {
    return await this.personaRepo.findByUser(userId);
  }

  private async generateConversationSummary(conversationId: string): Promise<string> {
    const messages = await this.conversationRepo.getMessages(conversationId);
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following conversation in 2-3 sentences, focusing on key topics, decisions, and outcomes.'
        },
        {
          role: 'user',
          content: conversation
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    });

    return response.choices[0].message.content || 'Conversation summary not available.';
  }

  private async extractAndStoreSemanticMemories(
    message: ChatMessage,
    messageId: string
  ): Promise<void> {
    // TODO: Implement semantic extraction
    // Use OpenAI to extract facts, preferences, insights from user message
    console.log(`🔍 Extracting semantic memories from message ${messageId} (placeholder)`);
  }

  private async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw new Error(`Failed to create embedding: ${error}`);
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Cleanup and maintenance
  async cleanupExpiredMemories(): Promise<void> {
    const deleted = await this.memoryRepo.deleteExpired();
    console.log(`🧹 Cleaned up ${deleted} expired memories`);
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
  }> {
    const checks = {
      memoryRepo: true, // TODO: Add actual health checks
      conversationRepo: true,
      cacheRepo: await this.cacheRepo.getStats().then(() => true).catch(() => false),
      personaRepo: true
    };

    const healthyCount = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalChecks) {
      status = 'healthy';
    } else if (healthyCount >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }
}