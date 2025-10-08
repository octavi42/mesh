-- Create chat_invitations table for external user invitations
CREATE TABLE IF NOT EXISTS public.chat_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invite_token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(chat_id, email)
);

-- Enable RLS
ALTER TABLE public.chat_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for chat_invitations

-- Users can view invitations for their email
CREATE POLICY "Users can view their own invitations"
  ON public.chat_invitations FOR SELECT
  USING (
    email = (SELECT email FROM public.users WHERE id = current_user_id())
    OR
    invited_by = current_user_id()
    OR
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_invitations.chat_id
      AND chats.created_by = current_user_id()
    )
  );

-- Chat creators can create invitations
CREATE POLICY "Chat creators can create invitations"
  ON public.chat_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_invitations.chat_id
      AND chats.created_by = current_user_id()
    )
  );

-- Users can update their own invitations (accept/reject)
CREATE POLICY "Users can update their own invitations"
  ON public.chat_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM public.users WHERE id = current_user_id())
  );

-- Chat creators can delete invitations
CREATE POLICY "Chat creators can delete invitations"
  ON public.chat_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_invitations.chat_id
      AND chats.created_by = current_user_id()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_chat_invitations_email ON public.chat_invitations(email);
CREATE INDEX idx_chat_invitations_token ON public.chat_invitations(invite_token);
CREATE INDEX idx_chat_invitations_chat_id ON public.chat_invitations(chat_id);
CREATE INDEX idx_chat_invitations_status ON public.chat_invitations(status);
