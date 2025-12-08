// Repository interfaces for memory system abstraction

import {
  BaseMemory,
  ConversationMemory,
  ProceduralMemory,
  PersonaMemory,
  SemanticSearchQuery,
  SemanticSearchResult,
  CachedResponse,
  Conversation,
  ChatMessage,
  UserPersona,
  MemoryType,
  MemoryScope
} from '../types';

export interface MemoryRepository {
  // Basic CRUD operations
  save(memory: BaseMemory): Promise<BaseMemory>;
  findById(id: string): Promise<BaseMemory | null>;
  findByUser(userId: string, types?: MemoryType[]): Promise<BaseMemory[]>;
  findByScope(scope: MemoryScope, types?: MemoryType[]): Promise<BaseMemory[]>;
  delete(id: string): Promise<void>;
  deleteExpired(): Promise<number>;

  // Semantic search operations
  searchSemantic(query: SemanticSearchQuery): Promise<SemanticSearchResult[]>;
  findSimilar(embedding: number[], memoryType?: MemoryType, limit?: number): Promise<SemanticSearchResult[]>;

  // Batch operations
  saveBatch(memories: BaseMemory[]): Promise<BaseMemory[]>;
  deleteByUser(userId: string): Promise<number>;
}

export interface ConversationRepository {
  // Conversation management
  create(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  findByUser(userId: string, limit?: number): Promise<Conversation[]>;
  updateSummary(id: string, summary: string): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  delete(id: string): Promise<void>;

  // Message management
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage>;
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<ChatMessage[]>;
  getRecentMessages(conversationId: string, count: number): Promise<ChatMessage[]>;
  deleteMessage(messageId: string): Promise<void>;
  
  // Conversation analytics
  getTokenCount(conversationId: string): Promise<number>;
  getMessageCount(conversationId: string): Promise<number>;
  updateLastActivity(conversationId: string): Promise<void>;
}

export interface CacheRepository {
  // Semantic caching
  get(query: string, userId: string, similarityThreshold?: number): Promise<CachedResponse | null>;
  set(query: string, response: any, userId: string, ttl?: number): Promise<void>;
  
  // General caching
  getValue(key: string): Promise<any | null>;
  setValue(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  
  // Cache management
  clear(): Promise<void>;
  getStats(): Promise<{ hits: number; misses: number; hitRate: number }>;
}

export interface PersonaRepository {
  // Persona management
  save(persona: UserPersona): Promise<UserPersona>;
  findByUser(userId: string): Promise<UserPersona | null>;
  updateTraits(userId: string, traits: Partial<UserPersona['traits']>): Promise<void>;
  updatePreferences(userId: string, preferences: Partial<UserPersona['preferences']>): Promise<void>;
  updateWorkPatterns(userId: string, patterns: Partial<UserPersona['workPatterns']>): Promise<void>;
  delete(userId: string): Promise<void>;

  // Analytics
  getCommonPatterns(userId: string): Promise<{ queries: string[]; tools: string[]; patterns: any[] }>;
}

export interface ToolRegistryRepository {
  // Tool discovery and management
  registerTool(integrationId: string, toolData: any): Promise<void>;
  findToolsByQuery(query: string, userId?: string): Promise<any[]>;
  findToolsByIntegration(integrationId: string): Promise<any[]>;
  updateToolUsage(toolId: string, userId: string, success: boolean): Promise<void>;
  getPopularTools(userId?: string, limit?: number): Promise<any[]>;
}

// Factory interface for creating repositories
export interface RepositoryFactory {
  createMemoryRepository(): MemoryRepository;
  createConversationRepository(): ConversationRepository;
  createCacheRepository(): CacheRepository;
  createPersonaRepository(): PersonaRepository;
  createToolRegistryRepository(): ToolRegistryRepository;
}

// Database connection interface
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}