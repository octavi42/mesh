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
          name: string
          email: string
          image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          image?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          name: string
          short_name: string
          color: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          short_name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string
          color?: string
          created_at?: string
        }
      }
      user_integrations: {
        Row: {
          user_id: string
          integration_id: string
          is_connected: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          integration_id: string
          is_connected?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          integration_id?: string
          is_connected?: boolean
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          label: string
          value: string
          description: string | null
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          value: string
          description?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          value?: string
          description?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          project_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_memberships: {
        Row: {
          chat_id: string
          user_id: string
          is_accepted: boolean
          joined_at: string
        }
        Insert: {
          chat_id: string
          user_id: string
          is_accepted?: boolean
          joined_at?: string
        }
        Update: {
          chat_id?: string
          user_id?: string
          is_accepted?: boolean
          joined_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          user_id: string | null
          text: string
          is_llm: boolean
          is_streaming: boolean
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id?: string | null
          text: string
          is_llm?: boolean
          is_streaming?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string | null
          text?: string
          is_llm?: boolean
          is_streaming?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
