import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return clientInstance
}

// Helper to set user context for RLS policies (Better Auth integration)
export async function setUserContext(userId: string) {
  const client = createClient()
  try {
    await client.rpc('set_user_id', { user_id: userId })
  } catch (error) {
    console.error('Error setting user context:', error)
  }
}
