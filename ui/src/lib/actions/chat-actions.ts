'use server'

import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createChat(data: {
  projectId: string
  title: string
  userIds?: string[]
  externalEmails?: string[]
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  await supabase.rpc('set_user_id', { user_id: session.user.id })

  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      project_id: data.projectId,
      name: data.title,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating chat:', error)
    throw error
  }

  const membershipsToAdd = []

  if (data.userIds && data.userIds.length > 0) {
    for (const userId of data.userIds) {
      membershipsToAdd.push({
        chat_id: chat.id,
        user_id: userId,
        is_accepted: true,
      })
    }
  }

  if (data.externalEmails && data.externalEmails.length > 0) {
    for (const email of data.externalEmails) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        membershipsToAdd.push({
          chat_id: chat.id,
          user_id: existingUser.id,
          is_accepted: false,
        })
      } else {
        console.log(`External user ${email} not found in database, skipping`)
      }
    }
  }

  if (membershipsToAdd.length > 0) {
    const { error: membershipError } = await supabase
      .from('chat_memberships')
      .insert(membershipsToAdd)

    if (membershipError) {
      console.error('Error adding members to chat:', membershipError)
      throw membershipError
    } else {
      console.log(`Successfully added ${membershipsToAdd.length} members to chat ${chat.id}`)
    }
  }

  revalidatePath(`/project/${data.projectId}`)

  return chat
}

export async function updateChatTitle(chatId: string, title: string) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('chats')
    .update({ name: title })
    .eq('id', chatId)

  if (error) {
    console.error('Error updating chat title:', error)
    throw error
  }

  revalidatePath(`/project/[id]/[chatId]`)
}

export async function deleteChat(chatId: string, projectId: string) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)

  if (error) {
    console.error('Error deleting chat:', error)
    throw error
  }

  revalidatePath(`/project/${projectId}`)
}

export async function addUserToChat(chatId: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chat_memberships')
    .insert({
      chat_id: chatId,
      user_id: userId,
      is_accepted: false,
    })

  if (error) {
    console.error('Error adding user to chat:', error)
    throw error
  }

  revalidatePath(`/project/[id]/[chatId]`)
}

export async function removeUserFromChat(chatId: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chat_memberships')
    .delete()
    .eq('chat_id', chatId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing user from chat:', error)
    throw error
  }

  revalidatePath(`/project/[id]/[chatId]`)
}

export async function acceptChatInvitation(chatId: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chat_memberships')
    .update({ is_accepted: true })
    .eq('chat_id', chatId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error accepting chat invitation:', error)
    throw error
  }

  revalidatePath(`/project/[id]/[chatId]`)
}
