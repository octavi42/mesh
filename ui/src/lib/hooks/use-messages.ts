"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useLocalMessages, addLocalMessage, markMessageAsSynced } from "@/lib/hooks/use-local-messages"
import { useEffect } from "react"

interface Message {
  id: string
  content: string
  user_id: string | null
  chat_id: string
  is_llm_message: boolean
  created_at: string
  user?: {
    id: string
    display_name: string
    avatar_url: string
  }
}

export function useMessages(chatId: string | undefined) {
  const localMessages = useLocalMessages(chatId || '')

  const serverQuery = useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return []

      const supabase = createClient()
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

      return data.map(msg => ({
        id: msg.id,
        content: msg.content,
        userId: msg.user_id,
        userName: msg.is_llm_message ? 'AI Assistant' : msg.user?.display_name || 'Unknown',
        avatarUrl: msg.is_llm_message
          ? 'https://api.dicebear.com/7.x/bottts/svg?seed=AI'
          : msg.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user?.display_name}`,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        createdAt: new Date(msg.created_at),
        isLlm: msg.is_llm_message,
        isStreaming: false,
        user: msg.user ? {
          id: msg.user.id,
          name: msg.user.display_name || '',
          image: msg.user.avatar_url || '',
          isAccepted: true,
          integrations: []
        } : undefined
      }))
    },
    enabled: !!chatId,
  })

  useEffect(() => {
    if (serverQuery.data && chatId) {
      const syncMessages = async () => {
        for (const msg of serverQuery.data) {
          const existingLocal = localMessages?.find(lm => lm.id === msg.id)
          if (!existingLocal) {
            try {
              await addLocalMessage({
                id: msg.id,
                chatId: chatId,
                userId: msg.userId || '',
                userName: msg.userName,
                avatarUrl: msg.avatarUrl,
                content: msg.content,
                isLlm: msg.isLlm,
                timestamp: msg.timestamp,
                createdAt: msg.createdAt,
                syncedToServer: true
              })
            } catch (error) {
              console.error('Error syncing message to local DB:', error)
            }
          }
        }
      }
      syncMessages()
    }
  }, [serverQuery.data, chatId, localMessages])

  const messages = localMessages && localMessages.length > 0
    ? localMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        userId: msg.userId,
        userName: msg.userName,
        avatarUrl: msg.avatarUrl,
        timestamp: msg.timestamp,
        createdAt: msg.createdAt,
        isLlm: msg.isLlm,
        isStreaming: msg.isStreaming,
        user: msg.isLlm ? undefined : {
          id: msg.userId,
          name: msg.userName,
          image: msg.avatarUrl,
          isAccepted: true,
          integrations: []
        }
      }))
    : serverQuery.data || []

  return {
    ...serverQuery,
    data: messages
  }
}

export function useAddMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newMessage: Message) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          content: newMessage.content,
          user_id: newMessage.user_id,
          is_llm_message: newMessage.is_llm_message
        }])
        .select(`
          *,
          user:users (
            id,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] })

      const previousMessages = queryClient.getQueryData(['messages', chatId])

      queryClient.setQueryData(['messages', chatId], (old: unknown = []) => [
        ...(Array.isArray(old) ? old : []),
        {
          id: `temp-${Date.now()}`,
          content: newMessage.content,
          userId: newMessage.user_id,
          userName: 'You',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=You`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          createdAt: new Date(),
          isLlm: newMessage.is_llm_message,
          isStreaming: false,
        }
      ])

      return { previousMessages }
    },
    onError: (err, newMessage, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', chatId], context.previousMessages)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
    },
  })
}
