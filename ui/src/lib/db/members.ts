import { createClient } from '@/lib/supabase/server'

export type Member = {
  id: string
  user_id: string
  project_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export type MemberWithUser = {
  id: string
  userId: string
  projectId: string
  role: 'admin' | 'member'
  joinedAt: string
  user: {
    id: string
    displayName: string
    email: string
    avatarUrl: string | null
  }
}

export async function getProjectMembers(projectId: string): Promise<MemberWithUser[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      user:users (
        id,
        display_name,
        email,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true })

  if (error) throw error

  return (data || []).map(member => ({
    id: member.id,
    userId: member.user_id,
    projectId: member.project_id,
    role: member.role,
    joinedAt: member.joined_at,
    user: {
      id: member.user.id,
      displayName: member.user.display_name || member.user.email,
      email: member.user.email,
      avatarUrl: member.user.avatar_url
    }
  }))
}

export async function getChatMembers(chatId: string): Promise<MemberWithUser[]> {
  const supabase = await createClient()

  // Get the project_id for this chat first
  const { data: chatData, error: chatError } = await supabase
    .from('chats')
    .select('project_id')
    .eq('id', chatId)
    .single()

  if (chatError) throw chatError

  // Then get all members of that project
  return getProjectMembers(chatData.project_id)
}
