import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from './types'
import { auth } from '@/lib/auth'

export async function createClient(useServiceRole = false) {
  const cookieStore = await cookies()
  const session = await auth.api.getSession({ headers: await headers() })

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    useServiceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        headers: session?.user?.id ? {
          'X-User-ID': session.user.id
        } : {}
      }
    }
  )

  if (session?.user?.id && !useServiceRole) {
    try {
      console.log('[Supabase Server] Setting user ID:', session.user.id)
      await client.rpc('set_user_id', { user_id: session.user.id })
      console.log('[Supabase Server] User ID set successfully')
    } catch (error) {
      console.error('[Supabase Server] Error setting user ID:', error)
    }
  } else {
    console.log('[Supabase Server] No session user ID found or using service role')
  }

  return client
}
