import { v4 as uuidv4 } from 'uuid';
import { ConversationRepository, DatabaseConnection } from './interfaces';
import { Conversation, ChatMessage } from '../types';

export class PostgreSQLConversationRepository implements ConversationRepository {
  constructor(private db: DatabaseConnection) {}

  async create(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> {
    const id = uuidv4();
    const sql = `
      INSERT INTO conversations (id, user_id, project_id, title, summary, token_count, last_activity)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      id,
      conversation.userId,
      conversation.projectId || null,
      conversation.title,
      conversation.summary || null,
      conversation.tokenCount || 0,
      conversation.lastActivity
    ];

    try {
      const result = await this.db.query(sql, params);
      return this.mapRowToConversation(result.rows[0]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error(`Failed to create conversation: ${error}`);
    }
  }

  async findById(id: string): Promise<Conversation | null> {
    const sql = `SELECT * FROM conversations WHERE id = $1`;

    try {
      const result = await this.db.query(sql, [id]);
      return result.rows.length > 0 ? this.mapRowToConversation(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding conversation by id:', error);
      throw new Error(`Failed to find conversation by id: ${error}`);
    }
  }

  async findByUser(userId: string, limit: number = 50): Promise<Conversation[]> {
    const sql = `
      SELECT * FROM conversations 
      WHERE user_id = $1 
      ORDER BY last_activity DESC 
      LIMIT $2
    `;

    try {
      const result = await this.db.query(sql, [userId, limit]);
      return result.rows.map(row => this.mapRowToConversation(row));
    } catch (error) {
      console.error('Error finding conversations by user:', error);
      throw new Error(`Failed to find conversations by user: ${error}`);
    }
  }

  async updateSummary(id: string, summary: string): Promise<void> {
    const sql = `
      UPDATE conversations 
      SET summary = $1, updated_at = NOW() 
      WHERE id = $2
    `;

    try {
      await this.db.query(sql, [summary, id]);
    } catch (error) {
      console.error('Error updating conversation summary:', error);
      throw new Error(`Failed to update conversation summary: ${error}`);
    }
  }

  async updateTitle(id: string, title: string): Promise<void> {
    const sql = `
      UPDATE conversations 
      SET title = $1, updated_at = NOW() 
      WHERE id = $2
    `;

    try {
      await this.db.query(sql, [title, id]);
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw new Error(`Failed to update conversation title: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM conversations WHERE id = $1`;

    try {
      await this.db.query(sql, [id]);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error(`Failed to delete conversation: ${error}`);
    }
  }

  async addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const id = uuidv4();
    const sql = `
      INSERT INTO messages (
        id, conversation_id, role, content, function_calls, token_count, embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      id,
      message.conversationId,
      message.role,
      message.content,
      message.functionCalls ? JSON.stringify(message.functionCalls) : null,
      message.tokenCount || 0,
      message.embedding ? `[${message.embedding.join(',')}]` : null
    ];

    try {
      const result = await this.db.query(sql, params);
      
      // Update conversation last_activity and token_count
      await this.updateLastActivity(message.conversationId);
      
      return this.mapRowToMessage(result.rows[0]);
    } catch (error) {
      console.error('Error adding message:', error);
      throw new Error(`Failed to add message: ${error}`);
    }
  }

  async getMessages(conversationId: string, limit: number = 100, offset: number = 0): Promise<ChatMessage[]> {
    const sql = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY timestamp ASC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(sql, [conversationId, limit, offset]);
      return result.rows.map(row => this.mapRowToMessage(row));
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new Error(`Failed to get messages: ${error}`);
    }
  }

  async getRecentMessages(conversationId: string, count: number): Promise<ChatMessage[]> {
    const sql = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;

    try {
      const result = await this.db.query(sql, [conversationId, count]);
      // Reverse to get chronological order
      return result.rows.reverse().map(row => this.mapRowToMessage(row));
    } catch (error) {
      console.error('Error getting recent messages:', error);
      throw new Error(`Failed to get recent messages: ${error}`);
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    const sql = `DELETE FROM messages WHERE id = $1`;

    try {
      await this.db.query(sql, [messageId]);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error(`Failed to delete message: ${error}`);
    }
  }

  async getTokenCount(conversationId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(token_count), 0) as total_tokens 
      FROM messages 
      WHERE conversation_id = $1
    `;

    try {
      const result = await this.db.query(sql, [conversationId]);
      return parseInt(result.rows[0].total_tokens) || 0;
    } catch (error) {
      console.error('Error getting token count:', error);
      throw new Error(`Failed to get token count: ${error}`);
    }
  }

  async getMessageCount(conversationId: string): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1`;

    try {
      const result = await this.db.query(sql, [conversationId]);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting message count:', error);
      throw new Error(`Failed to get message count: ${error}`);
    }
  }

  async updateLastActivity(conversationId: string): Promise<void> {
    const sql = `
      UPDATE conversations 
      SET last_activity = NOW(), 
          token_count = (
            SELECT COALESCE(SUM(token_count), 0) 
            FROM messages 
            WHERE conversation_id = $1
          )
      WHERE id = $1
    `;

    try {
      await this.db.query(sql, [conversationId]);
    } catch (error) {
      console.error('Error updating last activity:', error);
      throw new Error(`Failed to update last activity: ${error}`);
    }
  }

  private mapRowToConversation(row: any): Conversation {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      title: row.title,
      summary: row.summary,
      tokenCount: row.token_count || 0,
      lastActivity: new Date(row.last_activity),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToMessage(row: any): ChatMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      functionCalls: row.function_calls ? JSON.parse(row.function_calls) : undefined,
      tokenCount: row.token_count || 0,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      timestamp: new Date(row.timestamp)
    };
  }
}