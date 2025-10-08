-- Fix chat_memberships RLS to avoid recursion
DROP POLICY IF EXISTS "Users can view chat memberships" ON public.chat_memberships;

CREATE POLICY "Users can view chat memberships"
  ON public.chat_memberships FOR SELECT
  USING (
    -- Allow viewing if user is part of the chat
    user_id = current_user_id()
    OR
    -- Or if the user created the chat
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_memberships.chat_id
      AND chats.created_by = current_user_id()
    )
  );
