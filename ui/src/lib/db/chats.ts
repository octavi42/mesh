import { createClient } from '@/lib/supabase/server'

export type Chat = {
  id: string
  projectId: string
  title: string
  createdAt: string
}

// Get all chats for a project
export async function getChatsByProjectId(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map(chat => ({
    id: chat.id,
    projectId: chat.project_id,
    title: chat.name,
    createdAt: chat.created_at,
  }))
}

// Get chat by ID
export async function getChatById(chatId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single()

  if (error) throw error

  return {
    id: data.id,
    projectId: data.project_id,
    title: data.name,
    createdAt: data.created_at,
  }
}

// Get chat with project info
export async function getChatWithProject(chatId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chats')
    .select(`
      *,
      project:projects (*)
    `)
    .eq('id', chatId)
    .single()

  if (error) throw error
  return data
}
