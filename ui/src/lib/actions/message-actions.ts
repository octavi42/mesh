'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(data: {
  chatId: string
  userId: string
  text: string
}) {
  const supabase = await createClient()

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      chat_id: data.chatId,
      user_id: data.userId,
      text: data.text,
      is_llm: false,
      is_streaming: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error sending message:', error)
    throw error
  }

  // Revalidate the chat page
  revalidatePath(`/project/[id]/[chatId]`)

  return message
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting message:', error)
    throw error
  }

  revalidatePath(`/project/[id]/[chatId]`)
}
