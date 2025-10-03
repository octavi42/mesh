import { createClient } from '@/lib/supabase/server'

export type Message = {
  id: string
  chatId: string
  userId: string | null
  text: string
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
        name,
        image
      )
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return data.map(message => ({
    id: message.id,
    chatId: message.chat_id,
    userId: message.user_id,
    text: message.text,
    isLlm: message.is_llm,
    isStreaming: message.is_streaming,
    createdAt: message.created_at,
    userName: message.is_llm ? 'AI Assistant' : message.user?.name || 'Unknown',
    avatarUrl: message.is_llm
      ? 'https://api.dicebear.com/7.x/bottts/svg?seed=AI'
      : message.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user?.name}`,
    timestamp: new Date(message.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
    user: message.user ? {
      id: message.user.id,
      name: message.user.name,
      image: message.user.image || '',
      isAccepted: true,
      integrations: []
    } : undefined
  }))
}

// Create a new message
export async function createMessage(data: {
  chatId: string
  userId: string | null
  text: string
  isLlm?: boolean
  isStreaming?: boolean
}) {
  const supabase = await createClient()

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      chat_id: data.chatId,
      user_id: data.userId,
      text: data.text,
      is_llm: data.isLlm || false,
      is_streaming: data.isStreaming || false,
    })
    .select()
    .single()

  if (error) throw error
  return message
}
