import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedUser() {
  const userId = 'X1Wqr4eYWdkOYVzHQUgxiVDmjoMTAflw'
  const projectId = '11111111-1111-1111-1111-111111111111'
  const chatId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

  // 0. Check if user exists in public.users, if not sync from Better Auth
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existingUser) {
    console.log('User not in public.users, creating...')
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: 'rein_sprites.5y@icloud.com',
        display_name: 'User',
        avatar_url: null
      })

    if (error) {
      console.error('Error creating user:', error)
      return
    }
    console.log('✓ User created in public.users')
  } else {
    console.log('✓ User already exists')
  }

  // 1. Create project
  const { error: projectError } = await supabase
    .from('projects')
    .upsert({ id: projectId, name: 'Default Project', created_by: userId })

  if (projectError) {
    console.error('Error creating project:', projectError)
  } else {
    console.log('✓ Project created')
  }

  // 2. Add user as member
  const { error: memberError } = await supabase
    .from('members')
    .upsert({ project_id: projectId, user_id: userId, role: 'admin' })

  if (memberError) {
    console.error('Error adding member:', memberError)
  } else {
    console.log('✓ User added as member')
  }

  // 3. Create chat
  const { error: chatError } = await supabase
    .from('chats')
    .upsert({ id: chatId, project_id: projectId, name: 'Project Planning Discussion', created_by: userId })

  if (chatError) {
    console.error('Error creating chat:', chatError)
  } else {
    console.log('✓ Chat created')
  }

  console.log('\nDone! You can now access the chat.')
}

seedUser()
