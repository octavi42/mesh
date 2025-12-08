import { 
  RepositoryFactory, 
  MemoryRepository, 
  ConversationRepository, 
  CacheRepository,
  PersonaRepository,
  ToolRegistryRepository,
  DatabaseConnection
} from './interfaces';
import { PostgreSQLConnection } from '../database/postgres-connection';
import { PostgreSQLMemoryRepository } from './postgres-memory-repository';
import { PostgreSQLConversationRepository } from './postgres-conversation-repository';
import { RedisCacheRepository } from './redis-cache-repository';

// Simple implementations for persona and tool registry (using same PostgreSQL connection)
class PostgreSQLPersonaRepository implements PersonaRepository {
  constructor(private db: DatabaseConnection) {}

  async save(persona: any): Promise<any> {
    const sql = `
      INSERT INTO user_personas (user_id, traits, preferences, work_patterns)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        traits = EXCLUDED.traits,
        preferences = EXCLUDED.preferences,
        work_patterns = EXCLUDED.work_patterns,
        updated_at = NOW()
      RETURNING *
    `;

    const params = [
      persona.userId,
      JSON.stringify(persona.traits),
      JSON.stringify(persona.preferences),
      JSON.stringify(persona.workPatterns)
    ];

    try {
      const result = await this.db.query(sql, params);
      return this.mapRowToPersona(result.rows[0]);
    } catch (error) {
      console.error('Error saving persona:', error);
      throw new Error(`Failed to save persona: ${error}`);
    }
  }

  async findByUser(userId: string): Promise<any | null> {
    const sql = `SELECT * FROM user_personas WHERE user_id = $1`;

    try {
      const result = await this.db.query(sql, [userId]);
      return result.rows.length > 0 ? this.mapRowToPersona(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding persona:', error);
      throw new Error(`Failed to find persona: ${error}`);
    }
  }

  async updateTraits(userId: string, traits: any): Promise<void> {
    const sql = `
      UPDATE user_personas 
      SET traits = $2, updated_at = NOW() 
      WHERE user_id = $1
    `;

    try {
      await this.db.query(sql, [userId, JSON.stringify(traits)]);
    } catch (error) {
      console.error('Error updating traits:', error);
      throw new Error(`Failed to update traits: ${error}`);
    }
  }

  async updatePreferences(userId: string, preferences: any): Promise<void> {
    const sql = `
      UPDATE user_personas 
      SET preferences = $2, updated_at = NOW() 
      WHERE user_id = $1
    `;

    try {
      await this.db.query(sql, [userId, JSON.stringify(preferences)]);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new Error(`Failed to update preferences: ${error}`);
    }
  }

  async updateWorkPatterns(userId: string, patterns: any): Promise<void> {
    const sql = `
      UPDATE user_personas 
      SET work_patterns = $2, updated_at = NOW() 
      WHERE user_id = $1
    `;

    try {
      await this.db.query(sql, [userId, JSON.stringify(patterns)]);
    } catch (error) {
      console.error('Error updating work patterns:', error);
      throw new Error(`Failed to update work patterns: ${error}`);
    }
  }

  async delete(userId: string): Promise<void> {
    const sql = `DELETE FROM user_personas WHERE user_id = $1`;

    try {
      await this.db.query(sql, [userId]);
    } catch (error) {
      console.error('Error deleting persona:', error);
      throw new Error(`Failed to delete persona: ${error}`);
    }
  }

  async getCommonPatterns(userId: string): Promise<any> {
    // TODO: Implement analytics queries
    return {
      queries: [],
      tools: [],
      patterns: []
    };
  }

  private mapRowToPersona(row: any): any {
    return {
      userId: row.user_id,
      traits: row.traits || {},
      preferences: row.preferences || {},
      workPatterns: row.work_patterns || {},
      updatedAt: new Date(row.updated_at)
    };
  }
}

class PostgreSQLToolRegistryRepository implements ToolRegistryRepository {
  constructor(private db: DatabaseConnection) {}

  async registerTool(integrationId: string, toolData: any): Promise<void> {
    const sql = `
      INSERT INTO tool_registry (integration_id, tool_name, tool_data, embedding)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (integration_id, tool_name) DO UPDATE SET
        tool_data = EXCLUDED.tool_data,
        embedding = EXCLUDED.embedding,
        updated_at = NOW()
    `;

    const params = [
      integrationId,
      toolData.name,
      JSON.stringify(toolData),
      toolData.embedding ? `[${toolData.embedding.join(',')}]` : null
    ];

    try {
      await this.db.query(sql, params);
    } catch (error) {
      console.error('Error registering tool:', error);
      throw new Error(`Failed to register tool: ${error}`);
    }
  }

  async findToolsByQuery(query: string, userId?: string): Promise<any[]> {
    // TODO: Implement semantic search for tools
    // For now, return empty array
    return [];
  }

  async findToolsByIntegration(integrationId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM tool_registry 
      WHERE integration_id = $1 
      ORDER BY usage_count DESC
    `;

    try {
      const result = await this.db.query(sql, [integrationId]);
      return result.rows.map(row => ({
        ...JSON.parse(row.tool_data),
        usageCount: row.usage_count,
        successRate: row.success_rate
      }));
    } catch (error) {
      console.error('Error finding tools by integration:', error);
      throw new Error(`Failed to find tools by integration: ${error}`);
    }
  }

  async updateToolUsage(toolId: string, userId: string, success: boolean): Promise<void> {
    const sql = `
      UPDATE tool_registry 
      SET usage_count = usage_count + 1,
          success_rate = CASE 
            WHEN usage_count = 0 THEN CASE WHEN $3 THEN 1.0 ELSE 0.0 END
            ELSE (success_rate * usage_count + CASE WHEN $3 THEN 1 ELSE 0 END) / (usage_count + 1)
          END
      WHERE id = $1
    `;

    try {
      await this.db.query(sql, [toolId, userId, success]);
    } catch (error) {
      console.error('Error updating tool usage:', error);
      throw new Error(`Failed to update tool usage: ${error}`);
    }
  }

  async getPopularTools(userId?: string, limit: number = 10): Promise<any[]> {
    const sql = `
      SELECT * FROM tool_registry 
      ORDER BY usage_count DESC, success_rate DESC 
      LIMIT $1
    `;

    try {
      const result = await this.db.query(sql, [limit]);
      return result.rows.map(row => ({
        ...JSON.parse(row.tool_data),
        usageCount: row.usage_count,
        successRate: row.success_rate
      }));
    } catch (error) {
      console.error('Error getting popular tools:', error);
      throw new Error(`Failed to get popular tools: ${error}`);
    }
  }
}

export class PostgreSQLRepositoryFactory implements RepositoryFactory {
  private dbConnection: PostgreSQLConnection;
  private cacheConnection: RedisCacheRepository;

  constructor(
    dbConfig?: any,
    cacheConfig?: any
  ) {
    this.dbConnection = new PostgreSQLConnection(dbConfig);
    this.cacheConnection = new RedisCacheRepository(cacheConfig);
  }

  async initialize(): Promise<void> {
    await this.dbConnection.connect();
    await this.dbConnection.initializeSchema();
    await this.cacheConnection.connect();
    
    console.log('✅ Repository factory initialized');
  }

  async cleanup(): Promise<void> {
    await this.dbConnection.disconnect();
    await this.cacheConnection.disconnect();
    
    console.log('🧹 Repository factory cleaned up');
  }

  createMemoryRepository(): MemoryRepository {
    return new PostgreSQLMemoryRepository(this.dbConnection);
  }

  createConversationRepository(): ConversationRepository {
    return new PostgreSQLConversationRepository(this.dbConnection);
  }

  createCacheRepository(): CacheRepository {
    return this.cacheConnection;
  }

  createPersonaRepository(): PersonaRepository {
    return new PostgreSQLPersonaRepository(this.dbConnection);
  }

  createToolRegistryRepository(): ToolRegistryRepository {
    return new PostgreSQLToolRegistryRepository(this.dbConnection);
  }

  // Utility methods
  getDatabaseConnection(): DatabaseConnection {
    return this.dbConnection;
  }

  getCacheConnection(): RedisCacheRepository {
    return this.cacheConnection;
  }

  async healthCheck(): Promise<{
    database: boolean;
    cache: boolean;
    overall: boolean;
  }> {
    const dbHealth = this.dbConnection.isConnected();
    const cacheHealth = await this.cacheConnection.ping();
    
    return {
      database: dbHealth,
      cache: cacheHealth,
      overall: dbHealth && cacheHealth
    };
  }
}

// Singleton instance for the app
let factoryInstance: PostgreSQLRepositoryFactory | null = null;

export function getRepositoryFactory(): PostgreSQLRepositoryFactory {
  if (!factoryInstance) {
    factoryInstance = new PostgreSQLRepositoryFactory();
  }
  return factoryInstance;
}

export async function initializeRepositories(): Promise<PostgreSQLRepositoryFactory> {
  const factory = getRepositoryFactory();
  await factory.initialize();
  return factory;
}