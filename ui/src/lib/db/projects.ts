import { createClient } from '@/lib/supabase/server'

export type Project = {
  id: string
  name: string
  created_by: string
  created_at: string
}

// Get all projects
export async function getProjects(userId?: string) {
  const supabase = await createClient(true) // Use service role to bypass RLS

  console.log('[getProjects] Fetching projects for user:', userId)

  if (!userId) {
    console.log('[getProjects] No user ID provided, returning empty array')
    return []
  }

  // First check if any members exist for this user
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', userId)

  console.log('[getProjects] Members for user:', { memberData, memberError })

  // Then check all projects
  const { data: allProjects, error: allProjectsError } = await supabase
    .from('projects')
    .select('*')

  console.log('[getProjects] All projects:', { allProjects, allProjectsError })

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      members!inner(user_id)
    `)
    .eq('members.user_id', userId)
    .order('created_at')

  console.log('[getProjects] Filtered result:', { data, error })
  if (error) throw error

  return data.map(({ members, ...project }) => project)
}

// Get project by ID
export async function getProjectById(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw error
  return data
}

// Get project by value (slug)
export async function getProjectByValue(value: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('value', value)
    .single()

  if (error) throw error
  return data
}

// Create project
export async function createProject(name: string, userId: string, teamMembers?: string[]) {
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name,
      created_by: userId,
    })
    .select()
    .single()

  if (projectError) throw projectError

  if (teamMembers && teamMembers.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .in('email', teamMembers)

    if (usersError) throw usersError

    if (users && users.length > 0) {
      const memberInserts = users.map(user => ({
        user_id: user.id,
        project_id: project.id,
        role: 'member' as const,
      }))

      const { error: membersError } = await supabase
        .from('members')
        .insert(memberInserts)

      if (membersError) throw membersError
    }
  }

  return project
}
