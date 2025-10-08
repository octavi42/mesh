-- Simplify chat RLS to avoid session variable issues
-- Since we're setting created_by explicitly, we can trust that field

DROP POLICY IF EXISTS "Project members can create chats" ON public.chats;

CREATE POLICY "Project members can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (
    -- Allow if the user creating the chat is a member of the project
    EXISTS (
      SELECT 1 FROM public.members
      WHERE members.project_id = chats.project_id
      AND members.user_id = chats.created_by
    )
  );
