// Main entry point for the memory system
export * from './types';
export * from './repositories/interfaces';
export * from './repositories/factory';
export * from './services/memory-service';

// Re-export key implementations
export { PostgreSQLRepositoryFactory, initializeRepositories } from './repositories/factory';
export { MemoryService } from './services/memory-service';

// Convenience factory function
import { PostgreSQLRepositoryFactory, initializeRepositories } from './repositories/factory';
import { MemoryService, MemoryServiceConfig } from './services/memory-service';

export interface MemorySystemConfig {
  database?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
  };
  cache?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
  openai?: {
    apiKey: string;
  };
  memory?: Partial<MemoryServiceConfig>;
}

let memorySystemInstance: MemorySystem | null = null;

export class MemorySystem {
  private repositoryFactory: PostgreSQLRepositoryFactory;
  private memoryService: MemoryService;
  private isInitialized: boolean = false;

  constructor(private config: MemorySystemConfig) {
    this.repositoryFactory = new PostgreSQLRepositoryFactory(
      config.database,
      config.cache
    );

    if (!config.openai?.apiKey) {
      throw new Error('OpenAI API key is required for memory system');
    }

    this.memoryService = new MemoryService(
      this.repositoryFactory,
      config.openai.apiKey,
      config.memory
    );
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Memory system already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing memory system...');
      
      await this.repositoryFactory.initialize();
      
      this.isInitialized = true;
      console.log('✅ Memory system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize memory system:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.repositoryFactory.cleanup();
      this.isInitialized = false;
      console.log('👋 Memory system shut down');
    } catch (error) {
      console.error('Error shutting down memory system:', error);
    }
  }

  getMemoryService(): MemoryService {
    if (!this.isInitialized) {
      throw new Error('Memory system not initialized. Call initialize() first.');
    }
    return this.memoryService;
  }

  getRepositoryFactory(): PostgreSQLRepositoryFactory {
    return this.repositoryFactory;
  }

  async healthCheck(): Promise<{
    system: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      database: boolean;
      cache: boolean;
      memory: 'healthy' | 'degraded' | 'unhealthy';
    };
  }> {
    if (!this.isInitialized) {
      return {
        system: 'unhealthy',
        components: {
          database: false,
          cache: false,
          memory: 'unhealthy'
        }
      };
    }

    const repoHealth = await this.repositoryFactory.healthCheck();
    const memoryHealth = await this.memoryService.getHealthStatus();

    const components = {
      database: repoHealth.database,
      cache: repoHealth.cache,
      memory: memoryHealth.status
    };

    // Determine overall system health
    let system: 'healthy' | 'degraded' | 'unhealthy';
    const healthyComponents = [
      components.database,
      components.cache,
      components.memory === 'healthy'
    ].filter(Boolean).length;

    if (healthyComponents === 3) {
      system = 'healthy';
    } else if (healthyComponents >= 2) {
      system = 'degraded';
    } else {
      system = 'unhealthy';
    }

    return { system, components };
  }
}

// Factory functions for easy setup
export async function createMemorySystem(config: MemorySystemConfig): Promise<MemorySystem> {
  const system = new MemorySystem(config);
  await system.initialize();
  return system;
}

export function getMemorySystem(): MemorySystem {
  if (!memorySystemInstance) {
    throw new Error('Memory system not initialized. Call createMemorySystem() first.');
  }
  return memorySystemInstance;
}

export async function initializeGlobalMemorySystem(config: MemorySystemConfig): Promise<MemorySystem> {
  if (memorySystemInstance) {
    console.log('⚠️ Global memory system already initialized');
    return memorySystemInstance;
  }

  memorySystemInstance = await createMemorySystem(config);
  return memorySystemInstance;
}

export async function shutdownGlobalMemorySystem(): Promise<void> {
  if (memorySystemInstance) {
    await memorySystemInstance.shutdown();
    memorySystemInstance = null;
  }
}

// Development helpers
export async function createTestMemorySystem(): Promise<MemorySystem> {
  const config: MemorySystemConfig = {
    database: {
      database: 'teamai_memory_test',
      user: 'postgres',
      password: '',
      host: 'localhost',
      port: 5432
    },
    cache: {
      host: 'localhost',
      port: 6379,
      db: 1 // Use different DB for tests
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    },
    memory: {
      maxContextTokens: 10000,
      cacheEnabled: true,
      summaryThreshold: 10
    }
  };

  return createMemorySystem(config);
}