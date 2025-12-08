import { v4 as uuidv4 } from 'uuid';
import { 
  MemoryRepository, 
  DatabaseConnection 
} from './interfaces';
import {
  BaseMemory,
  MemoryType,
  MemoryScope,
  SemanticSearchQuery,
  SemanticSearchResult
} from '../types';

export class PostgreSQLMemoryRepository implements MemoryRepository {
  constructor(private db: DatabaseConnection) {}

  async save(memory: BaseMemory): Promise<BaseMemory> {
    const id = memory.id || uuidv4();
    const sql = `
      INSERT INTO memory_segments (
        id, user_id, memory_type, content, embedding, metadata, 
        scope_type, scope_id, relevance_score, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        relevance_score = EXCLUDED.relevance_score,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      RETURNING *
    `;

    const params = [
      id,
      memory.userId,
      memory.type,
      memory.content,
      memory.embedding ? `[${memory.embedding.join(',')}]` : null,
      JSON.stringify(memory.metadata),
      memory.scope.type,
      memory.scope.id,
      memory.relevanceScore || 1.0,
      memory.expiresAt
    ];

    try {
      const result = await this.db.query(sql, params);
      return this.mapRowToMemory(result.rows[0]);
    } catch (error) {
      console.error('Error saving memory:', error);
      throw new Error(`Failed to save memory: ${error}`);
    }
  }

  async findById(id: string): Promise<BaseMemory | null> {
    const sql = `
      SELECT * FROM memory_segments 
      WHERE id = $1 AND (expires_at IS NULL OR expires_at > NOW())
    `;

    try {
      const result = await this.db.query(sql, [id]);
      return result.rows.length > 0 ? this.mapRowToMemory(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding memory by id:', error);
      throw new Error(`Failed to find memory by id: ${error}`);
    }
  }

  async findByUser(userId: string, types?: MemoryType[]): Promise<BaseMemory[]> {
    let sql = `
      SELECT * FROM memory_segments 
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const params: any[] = [userId];

    if (types && types.length > 0) {
      sql += ` AND memory_type = ANY($2)`;
      params.push(types);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    try {
      const result = await this.db.query(sql, params);
      return result.rows.map(row => this.mapRowToMemory(row));
    } catch (error) {
      console.error('Error finding memories by user:', error);
      throw new Error(`Failed to find memories by user: ${error}`);
    }
  }

  async findByScope(scope: MemoryScope, types?: MemoryType[]): Promise<BaseMemory[]> {
    let sql = `
      SELECT * FROM memory_segments 
      WHERE scope_type = $1 AND scope_id = $2 AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const params: any[] = [scope.type, scope.id];

    if (types && types.length > 0) {
      sql += ` AND memory_type = ANY($3)`;
      params.push(types);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    try {
      const result = await this.db.query(sql, params);
      return result.rows.map(row => this.mapRowToMemory(row));
    } catch (error) {
      console.error('Error finding memories by scope:', error);
      throw new Error(`Failed to find memories by scope: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM memory_segments WHERE id = $1`;

    try {
      await this.db.query(sql, [id]);
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw new Error(`Failed to delete memory: ${error}`);
    }
  }

  async deleteExpired(): Promise<number> {
    const sql = `DELETE FROM memory_segments WHERE expires_at IS NOT NULL AND expires_at < NOW()`;

    try {
      const result = await this.db.query(sql);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting expired memories:', error);
      throw new Error(`Failed to delete expired memories: ${error}`);
    }
  }

  async searchSemantic(query: SemanticSearchQuery): Promise<SemanticSearchResult[]> {
    if (!query.embedding) {
      throw new Error('Embedding is required for semantic search');
    }

    let sql = `
      SELECT *, 
             (embedding <=> $1) as distance,
             1 - (embedding <=> $1) as similarity
      FROM memory_segments 
      WHERE (expires_at IS NULL OR expires_at > NOW())
        AND embedding IS NOT NULL
    `;
    
    const params: any[] = [`[${query.embedding.join(',')}]`];
    let paramIndex = 2;

    // Add filters
    if (query.memoryTypes && query.memoryTypes.length > 0) {
      sql += ` AND memory_type = ANY($${paramIndex})`;
      params.push(query.memoryTypes);
      paramIndex++;
    }

    if (query.scope) {
      sql += ` AND scope_type = $${paramIndex} AND scope_id = $${paramIndex + 1}`;
      params.push(query.scope.type, query.scope.id);
      paramIndex += 2;
    }

    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        sql += ` AND metadata->>'${key}' = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    // Add similarity threshold
    const threshold = query.similarityThreshold || 0.7;
    sql += ` AND (1 - (embedding <=> $1)) >= ${threshold}`;

    // Order by similarity and limit
    sql += ` ORDER BY similarity DESC LIMIT ${query.limit || 20}`;

    try {
      const result = await this.db.query(sql, params);
      return result.rows.map((row, index) => ({
        memory: this.mapRowToMemory(row),
        similarity: parseFloat(row.similarity),
        rank: index + 1
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      throw new Error(`Semantic search failed: ${error}`);
    }
  }

  async findSimilar(embedding: number[], memoryType?: MemoryType, limit: number = 10): Promise<SemanticSearchResult[]> {
    let sql = `
      SELECT *, 
             (embedding <=> $1) as distance,
             1 - (embedding <=> $1) as similarity
      FROM memory_segments 
      WHERE (expires_at IS NULL OR expires_at > NOW())
        AND embedding IS NOT NULL
    `;
    
    const params: any[] = [`[${embedding.join(',')}]`];

    if (memoryType) {
      sql += ` AND memory_type = $2`;
      params.push(memoryType);
    }

    sql += ` ORDER BY similarity DESC LIMIT ${limit}`;

    try {
      const result = await this.db.query(sql, params);
      return result.rows.map((row, index) => ({
        memory: this.mapRowToMemory(row),
        similarity: parseFloat(row.similarity),
        rank: index + 1
      }));
    } catch (error) {
      console.error('Error finding similar memories:', error);
      throw new Error(`Failed to find similar memories: ${error}`);
    }
  }

  async saveBatch(memories: BaseMemory[]): Promise<BaseMemory[]> {
    return this.db.transaction(async (client) => {
      const savedMemories: BaseMemory[] = [];
      
      for (const memory of memories) {
        const id = memory.id || uuidv4();
        const sql = `
          INSERT INTO memory_segments (
            id, user_id, memory_type, content, embedding, metadata, 
            scope_type, scope_id, relevance_score, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;

        const params = [
          id,
          memory.userId,
          memory.type,
          memory.content,
          memory.embedding ? `[${memory.embedding.join(',')}]` : null,
          JSON.stringify(memory.metadata),
          memory.scope.type,
          memory.scope.id,
          memory.relevanceScore || 1.0,
          memory.expiresAt
        ];

        const result = await client.query(sql, params);
        savedMemories.push(this.mapRowToMemory(result.rows[0]));
      }

      return savedMemories;
    });
  }

  async deleteByUser(userId: string): Promise<number> {
    const sql = `DELETE FROM memory_segments WHERE user_id = $1`;

    try {
      const result = await this.db.query(sql, [userId]);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting memories by user:', error);
      throw new Error(`Failed to delete memories by user: ${error}`);
    }
  }

  private mapRowToMemory(row: any): BaseMemory {
    return {
      id: row.id,
      type: row.memory_type as MemoryType,
      content: row.content,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      metadata: row.metadata || {},
      timestamp: new Date(row.created_at),
      userId: row.user_id,
      scope: {
        id: row.scope_id,
        type: row.scope_type,
        isolation: 'private' // Default, could be stored in metadata
      },
      relevanceScore: row.relevance_score,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
    };
  }
}