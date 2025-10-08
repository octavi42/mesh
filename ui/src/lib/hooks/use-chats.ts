"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient, setUserContext } from "@/lib/supabase/client"
import { useSession } from "@/lib/hooks/use-session"
import type { Chat } from "@/lib/types"

export function useChats(projectId: string | undefined) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['chats', projectId],
    queryFn: async () => {
      if (!projectId) return []
      if (!session?.user?.id) return []

      await setUserContext(session.user.id)

      const supabase = createClient()
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching chats:', error)
        throw error
      }

      console.log('Fetched chats:', data)

      return data.map(chat => ({
        id: chat.id,
        title: chat.name
      })) as Chat[]
    },
    enabled: !!projectId && !!session?.user?.id,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useChat(chatId: string | undefined) {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      if (!chatId) return null

      const supabase = createClient()
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single()

      if (error) throw error

      return data
    },
    enabled: !!chatId,
  })
}
