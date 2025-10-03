import { createClient } from '@/lib/supabase/server'

export type Project = {
  id: string
  name: string
  created_by: string
  created_at: string
}

// Get all projects
export async function getProjects() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at')

  if (error) throw error
  return data
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
