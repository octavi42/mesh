import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
  id: string
  chat_id: string
  user_id: string
  content: string
  is_llm_message: boolean
  created_at: string
}

export function useRealtimeMessages(
  chatId: string,
  onMessageReceived: (message: Message) => void
) {
  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel

    const setupRealtime = async () => {
      channel = supabase
        .channel(`chat:${chatId}`)
        .on(
          'broadcast',
          { event: 'new_message' },
          (payload) => {
            onMessageReceived(payload.payload as Message)
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [chatId, onMessageReceived])
}
