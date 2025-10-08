import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  const { data: invitation, error } = await supabase
    .from('chat_invitations')
    .select(`
      id,
      chat_id,
      email,
      status,
      expires_at,
      chats!inner (
        id,
        name,
        project_id
      )
    `)
    .eq('invite_token', token)
    .eq('status', 'pending')
    .single()

  if (error || !invitation) {
    return NextResponse.json(
      { error: 'Invitation not found or expired' },
      { status: 404 }
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'Invitation has expired' },
      { status: 410 }
    )
  }

  return NextResponse.json({
    id: invitation.id,
    chat_id: invitation.chat_id,
    email: invitation.email,
    chat_name: invitation.chats.name,
    project_id: invitation.chats.project_id,
  })
}
