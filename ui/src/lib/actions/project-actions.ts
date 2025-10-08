'use server'

import { createClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createProjectAction(data: {
  name: string
  description?: string
  context?: string
  teamMembers?: string[]
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  console.log('[createProjectAction] Full session object:', JSON.stringify(session, null, 2))

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  console.log('[createProjectAction] User ID:', session.user.id)

  // Use service role to bypass RLS - we've already validated the user above
  const supabase = await createClient(true)

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: data.name,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (projectError) {
    console.error('Error creating project:', projectError)
    throw projectError
  }

  if (data.teamMembers && data.teamMembers.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .in('email', data.teamMembers)

    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else if (users && users.length > 0) {
      const memberInserts = users.map(user => ({
        user_id: user.id,
        project_id: project.id,
        role: 'member' as const,
      }))

      const { error: membersError } = await supabase
        .from('members')
        .insert(memberInserts)

      if (membersError) {
        console.error('Error adding members:', membersError)
      }
    }
  }

  revalidatePath('/')

  return project
}
