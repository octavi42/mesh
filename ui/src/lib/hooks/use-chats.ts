"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient, setUserContext } from "@/lib/supabase/client"
import { useSession } from "@/lib/hooks/use-session"
import type { Chat } from "@/lib/types"

export function useChats(projectId: string | undefined) {
  const { data: session } = useSession()

  const query = useQuery({
    queryKey: ['chats', projectId],
    queryFn: async ({ queryKey }) => {
      const [, projectIdFromKey] = queryKey

      if (!projectIdFromKey) {
        return []
      }

      if (!session?.user?.id) {
        return []
      }

      const supabase = createClient()

      await setUserContext(session.user.id)

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('project_id', projectIdFromKey)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[useChats] Error fetching chats:', error)
        throw error
      }

      return data.map(chat => ({
        id: chat.id,
        title: chat.name
      })) as Chat[]
    },
    enabled: !!projectId && !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return query
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
