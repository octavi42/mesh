import { createClient } from '@/lib/supabase/server'

export type User = {
  id: string
  display_name: string | null
  email: string
  avatar_url: string | null
  created_at: string
  integrations?: Integration[]
  isAccepted?: boolean
  isInvited?: boolean
}

export type Integration = {
  id: string
  name: string
  shortName: string
  color: string
  isConnected: boolean
}

// Get all users
export async function getUsers() {
  const supabase = await createClient()

  const { data, error} = await supabase
    .from('users')
    .select('*')
    .order('email')

  if (error) throw error
  return data
}

// Get user by ID
export async function getUserById(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// Get user with integrations
export async function getUserWithIntegrations(userId: string) {
  const supabase = await createClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError) throw userError

  const { data: userIntegrations, error: intError } = await supabase
    .from('user_integrations')
    .select(`
      integration:integrations (
        id,
        name,
        icon_url
      )
    `)
    .eq('user_id', userId)

  if (intError) throw intError

  const integrations = userIntegrations?.map(ui => ({
    id: ui.integration.id,
    name: ui.integration.name,
    shortName: ui.integration.name.substring(0, 2).toUpperCase(),
    color: 'bg-blue-500',
    isConnected: true,
  })) || []

  return {
    ...user,
    integrations,
  }
}

// Get all users for a chat with their membership status
export async function getChatUsers(chatId: string) {
  const supabase = await createClient()

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('email')

  if (usersError) throw usersError

  // Get memberships for this chat
  const { data: memberships, error: membershipsError } = await supabase
    .from('chat_memberships')
    .select('user_id, is_accepted')
    .eq('chat_id', chatId)

  if (membershipsError) throw membershipsError

  // Get user integrations
  const { data: userIntegrations, error: intError } = await supabase
    .from('user_integrations')
    .select(`
      user_id,
      integration:integrations (
        id,
        name,
        icon_url
      )
    `)

  if (intError) throw intError

  // Combine data
  const usersWithStatus = users.map(user => {
    const membership = memberships?.find(m => m.user_id === user.id)
    const integrations = userIntegrations
      ?.filter(ui => ui.user_id === user.id)
      .map(ui => ({
        id: ui.integration.id,
        name: ui.integration.name,
        shortName: ui.integration.name.substring(0, 2).toUpperCase(),
        color: 'bg-blue-500',
        isConnected: true,
      })) || []

    return {
      ...user,
      integrations,
      isAccepted: membership?.is_accepted,
      isInvited: membership !== undefined,
    }
  })

  // Sort: accepted first, then pending, then not invited
  return usersWithStatus.sort((a, b) => {
    if (a.isAccepted === true && b.isAccepted !== true) return -1
    if (a.isAccepted !== true && b.isAccepted === true) return 1

    if (a.isInvited && a.isAccepted === false && (!b.isInvited || b.isAccepted === true)) return -1
    if ((!a.isInvited || a.isAccepted === true) && b.isInvited && b.isAccepted === false) return 1

    if (!a.isInvited && b.isInvited) return 1
    if (a.isInvited && !b.isInvited) return -1

    return 0
  })
}
