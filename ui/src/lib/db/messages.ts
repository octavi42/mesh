import { createClient } from '@/lib/supabase/server'

export type Message = {
  id: string
  chatId: string
  userId: string | null
  content: string
  isLlm: boolean
  isStreaming: boolean
  createdAt: string
  userName?: string
  avatarUrl?: string
  user?: {
    id: string
    name: string
    image: string | null
    isAccepted?: boolean
    isInvited?: boolean
    integrations?: any[]
  }
}

// Get messages for a chat
export async function getMessagesByChatId(chatId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      user:users (
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data.map(message => ({
    id: message.id,
    chatId: message.chat_id,
    userId: message.user_id,
    content: message.content,
    isLlm: message.is_llm_message,
    isStreaming: false,
    createdAt: message.created_at,
    userName: message.is_llm_message ? 'AI Assistant' : message.user?.display_name || 'Unknown',
    avatarUrl: message.is_llm_message
      ? 'https://api.dicebear.com/7.x/bottts/svg?seed=AI'
      : message.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user?.display_name}`,
    timestamp: new Date(message.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
    user: message.user ? {
      id: message.user.id,
      name: message.user.display_name || '',
      image: message.user.avatar_url || '',
      isAccepted: true,
      integrations: []
    } : undefined
  }))
}

// Create a new message
export async function createMessage(data: {
  chatId: string
  userId: string | null
  content: string
  isLlm?: boolean
}) {
  const supabase = await createClient()

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      chat_id: data.chatId,
      user_id: data.userId,
      content: data.content,
      is_llm_message: data.isLlm || false,
    })
    .select()
    .single()

  if (error) throw error
  return message
}
