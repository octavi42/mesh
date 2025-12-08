// Core domain types for memory system

export enum MemoryType {
  CONVERSATION = 'conversation',
  EPISODIC = 'episodic',         // Specific events/interactions
  SEMANTIC = 'semantic',         // Facts and knowledge
  PROCEDURAL = 'procedural',     // Tool usage patterns
  WORKING = 'working',           // Active context
  PERSONA = 'persona',           // User preferences
  TOOL_REGISTRY = 'tool_registry' // Available tools metadata
}

export enum MemoryScopeType {
  USER = 'user',
  PROJECT = 'project', 
  INTEGRATION = 'integration',
  GLOBAL = 'global'
}

export interface MemoryScope {
  id: string;
  type: MemoryScopeType;
  isolation: 'private' | 'shared';
  metadata?: Record<string, any>;
}

export interface BaseMemory {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  timestamp: Date;
  userId: string;
  scope: MemoryScope;
  relevanceScore?: number;
  expiresAt?: Date;
}

export interface ConversationMemory extends BaseMemory {
  type: MemoryType.CONVERSATION;
  conversationId: string;
  role: 'user' | 'assistant' | 'function';
  tokenCount: number;
  functionCalls?: any[];
}

export interface ProceduralMemory extends BaseMemory {
  type: MemoryType.PROCEDURAL;
  integrationId: string;
  actionName: string;
  parameters: Record<string, any>;
  success: boolean;
  executionTime: number;
}

export interface PersonaMemory extends BaseMemory {
  type: MemoryType.PERSONA;
  traits: {
    communicationStyle: 'formal' | 'casual' | 'technical';
    preferredIntegrations: string[];
    timezone: string;
    language: string;
  };
  preferences: Record<string, any>;
}

export interface SemanticSearchQuery {
  query: string;
  embedding?: number[];
  memoryTypes?: MemoryType[];
  scope?: MemoryScope;
  limit?: number;
  similarityThreshold?: number;
  filters?: Record<string, any>;
}

export interface SemanticSearchResult {
  memory: BaseMemory;
  similarity: number;
  rank: number;
}

export interface CachedResponse {
  id: string;
  query: string;
  response: any;
  embedding: number[];
  userId: string;
  similarity: number;
  timestamp: Date;
  hitCount: number;
}

export interface Conversation {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  summary?: string;
  tokenCount: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'function';
  content: string;
  functionCalls?: any[];
  tokenCount: number;
  embedding?: number[];
  timestamp: Date;
}

export interface UserPersona {
  userId: string;
  traits: {
    communicationStyle: 'formal' | 'casual' | 'technical';
    preferredIntegrations: string[];
    timezone: string;
    language: string;
  };
  preferences: {
    summaryLength: 'brief' | 'detailed';
    notificationFrequency: 'immediate' | 'batched' | 'daily';
    defaultFilters: Record<string, any>;
  };
  workPatterns: {
    activeHours: string[];
    commonQueries: string[];
    successfulWorkflows: any[];
  };
  updatedAt: Date;
}

export interface ContextAssembly {
  recentMessages: ChatMessage[];
  relevantMemories: BaseMemory[];
  userPersona?: UserPersona;
  suggestedTools: any[];
  conversationSummary?: string;
  tokenBudget: {
    allocated: number;
    used: number;
    remaining: number;
  };
}

export interface TokenAllocation {
  recentMessages: number;
  conversationSummary: number;
  relevantMemories: number;
  userPersona: number;
  systemPrompt: number;
}