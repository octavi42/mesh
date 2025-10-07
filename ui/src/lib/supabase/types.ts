export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          password_hash: string | null
          email_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          password_hash?: string | null
          email_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          password_hash?: string | null
          email_verified?: boolean | null
          updated_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          user_id: string
          project_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          project_id: string
          name: string
          is_private: boolean | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          is_private?: boolean | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          is_private?: boolean | null
          created_by?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          user_id: string | null
          content: string
          parent_message_id: string | null
          is_llm_message: boolean | null
          created_at: string
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          chat_id: string
          user_id?: string | null
          content: string
          parent_message_id?: string | null
          is_llm_message?: boolean | null
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string | null
          content?: string
          parent_message_id?: string | null
          is_llm_message?: boolean | null
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
