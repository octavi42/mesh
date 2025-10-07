'use server'

import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function sendMessage(data: {
  chatId: string
  content: string
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  console.log('Sending message with:', {
    chatId: data.chatId,
    userId: session.user.id,
    userIdType: typeof session.user.id,
    content: data.content.substring(0, 50)
  })

  const supabase = await createClient()

  // Test the connection
  const { data: testData, error: testError } = await supabase
    .from('chats')
    .select('id, name')
    .eq('id', data.chatId)
    .single()

  console.log('Chat exists check:', { testData, testError })

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      chat_id: data.chatId,
      user_id: session.user.id,
      content: data.content,
      is_llm_message: false,
    })
    .select(`
      *,
      user:users (
        id,
        display_name,
        avatar_url
      )
    `)
    .single()

  if (error) {
    console.error('Error sending message:', error)
    console.error('Insert attempted with:', {
      chat_id: data.chatId,
      user_id: session.user.id,
      content: data.content
    })
    throw error
  }

  const channel = supabase.channel(`chat:${data.chatId}`)
  await channel.send({
    type: 'broadcast',
    event: 'new_message',
    payload: message
  })

  revalidatePath(`/project/[id]/[chatId]`)

  return message
}

export async function deleteMessage(messageId: string) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

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
