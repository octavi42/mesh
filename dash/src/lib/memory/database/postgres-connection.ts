import { Pool, PoolClient } from 'pg';
import { DatabaseConnection } from '../repositories/interfaces';

export class PostgreSQLConnection implements DatabaseConnection {
  private pool: Pool;
  private _isConnected: boolean = false;

  constructor(config?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    max?: number;
  }) {
    const defaultConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'teamai_memory',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production',
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool({ ...defaultConfig, ...config });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      client.release();
      this._isConnected = true;
      console.log('✅ Connected to PostgreSQL');
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this._isConnected = false;
      console.log('🔌 Disconnected from PostgreSQL');
    } catch (error) {
      console.error('Error disconnecting from PostgreSQL:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } catch (error) {
      console.error('Query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Initialize database schema
  async initializeSchema(): Promise<void> {
    const schema = `
      -- Enable pgvector extension
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Conversations table (thread-level memory)
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255),
        title VARCHAR(500),
        summary TEXT,
        token_count INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Messages table (individual chat entries)
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'function')),
        content TEXT NOT NULL,
        function_calls JSONB,
        token_count INTEGER DEFAULT 0,
        embedding VECTOR(1536),
        timestamp TIMESTAMP DEFAULT NOW()
      );

      -- Memory segments (all memory types)
      CREATE TABLE IF NOT EXISTS memory_segments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(255) NOT NULL,
        memory_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        embedding VECTOR(1536),
        metadata JSONB DEFAULT '{}',
        scope_type VARCHAR(50) NOT NULL,
        scope_id VARCHAR(255) NOT NULL,
        relevance_score FLOAT DEFAULT 1.0,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- User personas table
      CREATE TABLE IF NOT EXISTS user_personas (
        user_id VARCHAR(255) PRIMARY KEY,
        traits JSONB DEFAULT '{}',
        preferences JSONB DEFAULT '{}',
        work_patterns JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tool registry table
      CREATE TABLE IF NOT EXISTS tool_registry (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        integration_id VARCHAR(255) NOT NULL,
        tool_name VARCHAR(255) NOT NULL,
        tool_data JSONB NOT NULL,
        embedding VECTOR(1536),
        usage_count INTEGER DEFAULT 0,
        success_rate FLOAT DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(integration_id, tool_name)
      );

      -- Cache table for semantic caching
      CREATE TABLE IF NOT EXISTS cache_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        query_hash VARCHAR(64) NOT NULL,
        query TEXT NOT NULL,
        response JSONB NOT NULL,
        embedding VECTOR(1536),
        user_id VARCHAR(255) NOT NULL,
        hit_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity DESC);
      
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages USING ivfflat (embedding vector_cosine_ops);
      
      CREATE INDEX IF NOT EXISTS idx_memory_user_type ON memory_segments(user_id, memory_type);
      CREATE INDEX IF NOT EXISTS idx_memory_scope ON memory_segments(scope_type, scope_id);
      CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory_segments USING ivfflat (embedding vector_cosine_ops);
      CREATE INDEX IF NOT EXISTS idx_memory_expires_at ON memory_segments(expires_at);
      
      CREATE INDEX IF NOT EXISTS idx_tool_integration ON tool_registry(integration_id);
      CREATE INDEX IF NOT EXISTS idx_tool_embedding ON tool_registry USING ivfflat (embedding vector_cosine_ops);
      
      CREATE INDEX IF NOT EXISTS idx_cache_user_query ON cache_entries(user_id, query_hash);
      CREATE INDEX IF NOT EXISTS idx_cache_embedding ON cache_entries USING ivfflat (embedding vector_cosine_ops);
      CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache_entries(expires_at);

      -- Update timestamp trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Apply update triggers
      DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
      CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_memory_segments_updated_at ON memory_segments;
      CREATE TRIGGER update_memory_segments_updated_at BEFORE UPDATE ON memory_segments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_user_personas_updated_at ON user_personas;
      CREATE TRIGGER update_user_personas_updated_at BEFORE UPDATE ON user_personas 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_tool_registry_updated_at ON tool_registry;
      CREATE TRIGGER update_tool_registry_updated_at BEFORE UPDATE ON tool_registry 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await this.query(schema);
      console.log('✅ Database schema initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
    }
  }

  // Clean up expired records
  async cleanupExpired(): Promise<void> {
    const cleanupSQL = `
      DELETE FROM memory_segments WHERE expires_at IS NOT NULL AND expires_at < NOW();
      DELETE FROM cache_entries WHERE expires_at IS NOT NULL AND expires_at < NOW();
    `;
    
    try {
      await this.query(cleanupSQL);
      console.log('🧹 Cleaned up expired records');
    } catch (error) {
      console.error('Error cleaning up expired records:', error);
    }
  }
}